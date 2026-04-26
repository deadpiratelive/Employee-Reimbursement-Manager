"""
Employee Management Routes
"""
from fastapi import APIRouter, HTTPException, Depends, status, UploadFile, File
from sqlalchemy.orm import Session
from pydantic import BaseModel, field_validator, ConfigDict
from typing import List, Optional
from datetime import datetime

from models import Employee, get_db, Expense

router = APIRouter()

# Pydantic models
class EmployeeCreate(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    first_name: str
    last_name: str
    email: str
    salary: Optional[float] = None
    department: Optional[str] = None

    @field_validator('email')
    @classmethod
    def validate_email(cls, v: str) -> str:
        if '@' not in v or '.' not in v:
            raise ValueError('Invalid email format')
        return v

class EmployeeUpdate(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    email: Optional[str] = None
    salary: Optional[float] = None
    department: Optional[str] = None
    is_active: Optional[bool] = None

class EmployeeResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    first_name: str
    last_name: str
    email: str
    salary: Optional[float] = None
    department: Optional[str] = None
    is_active: bool
    created_at: datetime
    updated_at: datetime

class EmployeeWithExpenses(EmployeeResponse):
    model_config = ConfigDict(from_attributes=True)
    expenses: List[dict] = []

# Routes
@router.get("/", response_model=List[EmployeeResponse])
def get_all_employees(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    """Get all employees"""
    employees = db.query(Employee).offset(skip).limit(limit).all()
    return employees

@router.get("/active", response_model=List[EmployeeResponse])
def get_active_employees(db: Session = Depends(get_db)):
    """Get only active employees"""
    employees = db.query(Employee).filter(Employee.is_active == True).all()
    return employees

@router.get("/{employee_id}", response_model=EmployeeWithExpenses)
def get_employee_by_id(employee_id: int, db: Session = Depends(get_db)):
    """Get employee by ID with their expenses"""
    employee = db.query(Employee).filter(Employee.id == employee_id).first()
    if not employee:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Employee not found"
        )
    
    # Convert to dict with expenses
    result = EmployeeResponse.model_validate(employee)
    result_dict = result.model_dump()
    result_dict["expenses"] = [exp.to_dict() for exp in employee.expenses]
    
    return result_dict

@router.post("/", response_model=EmployeeResponse, status_code=status.HTTP_201_CREATED)
def create_employee(employee_data: EmployeeCreate, db: Session = Depends(get_db)):
    """Create a new employee"""
    # Check if email exists
    existing = db.query(Employee).filter(Employee.email == employee_data.email).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Employee with this email already exists"
        )
    
    # Create new employee
    new_employee = Employee(
        first_name=employee_data.first_name,
        last_name=employee_data.last_name,
        email=employee_data.email,
        salary=employee_data.salary,
        department=employee_data.department
    )
    
    db.add(new_employee)
    db.commit()
    db.refresh(new_employee)
    
    return new_employee

@router.put("/{employee_id}", response_model=EmployeeResponse)
def update_employee(
    employee_id: int,
    employee_data: EmployeeUpdate,
    db: Session = Depends(get_db)
):
    """Update employee information"""
    employee = db.query(Employee).filter(Employee.id == employee_id).first()
    if not employee:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Employee not found"
        )
    
    # Check email uniqueness if updating email
    if employee_data.email and employee_data.email != employee.email:
        existing = db.query(Employee).filter(Employee.email == employee_data.email).first()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already in use"
            )
    
    # Update fields
    update_data = employee_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(employee, field, value)
    
    employee.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(employee)
    
    return employee

@router.delete("/{employee_id}")
def delete_employee(employee_id: int, db: Session = Depends(get_db)):
    """Soft delete employee (deactivate)"""
    employee = db.query(Employee).filter(Employee.id == employee_id).first()
    if not employee:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Employee not found"
        )
    
    employee.is_active = False
    employee.updated_at = datetime.utcnow()
    db.commit()
    
    return {"message": "Employee deactivated successfully"}

@router.get("/{employee_id}/stats")
def get_employee_stats(employee_id: int, db: Session = Depends(get_db)):
    """Get employee expense statistics"""
    employee = db.query(Employee).filter(Employee.id == employee_id).first()
    if not employee:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Employee not found"
        )
    
    expenses = employee.expenses
    total_expenses = len(expenses)
    total_amount = sum(float(exp.amount) for exp in expenses)
    
    approved_expenses = [exp for exp in expenses if exp.status.value == "APPROVED"]
    pending_expenses = [exp for exp in expenses if exp.status.value == "PENDING"]
    auto_approved = [exp for exp in expenses if exp.status.value == "AUTO_APPROVED"]
    
    return {
        "employee_id": employee_id,
        "employee_name": employee.full_name,
        "total_expenses": total_expenses,
        "total_amount": total_amount,
        "approved_count": len(approved_expenses),
        "pending_count": len(pending_expenses),
        "auto_approved_count": len(auto_approved),
        "approved_amount": sum(float(exp.amount) for exp in approved_expenses),
        "pending_amount": sum(float(exp.amount) for exp in pending_expenses),
        "auto_approved_amount": sum(float(exp.amount) for exp in auto_approved)
    }
