"""
Expense (Reimbursement) Routes
"""
from fastapi import APIRouter, HTTPException, Depends, status, UploadFile, File, Form
from sqlalchemy.orm import Session
from pydantic import BaseModel, ConfigDict
from typing import List, Optional
from datetime import datetime
import os
import shutil
from pathlib import Path

from models import Expense, Employee, User, get_db, ExpenseCategory, ExpenseStatus

router = APIRouter()

# Constants
AUTO_APPROVE_THRESHOLD = 6000.0
BILL_UPLOAD_DIR = Path("bill_images")
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB

# Ensure upload directory exists
BILL_UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

# Pydantic models
class ExpenseCreate(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    description: str
    amount: float
    category: str
    expense_date: datetime
    employee_id: int
    created_by: int

class ExpenseResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    amount: float
    description: Optional[str]
    category: str
    status: str
    expense_date: datetime
    created_at: datetime
    updated_at: datetime
    requires_bill: bool
    bill_url: Optional[str]
    employee_id: int
    created_by: int
    approver_id: Optional[int]
    employee_name: Optional[str]

class BillUploadResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    message: str
    expense_id: int
    bill_url: str

class ActionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    message: str
    expense_id: int
    approved_by: Optional[int] = None

class StatsResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    total_expenses: int
    total_amount: float
    pending_count: int
    approved_count: int
    auto_approved_count: int
    rejected_count: int
    pending_bills: int

# Helper functions
def validate_category(category: str) -> ExpenseCategory:
    try:
        return ExpenseCategory[category.upper()]
    except KeyError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid category. Must be one of: {[c.value for c in ExpenseCategory]}"
        )

def expense_to_dict(expense: Expense) -> dict:
    """Convert expense to dictionary safely"""
    return {
        "id": expense.id,
        "amount": float(expense.amount) if expense.amount else 0.0,
        "description": expense.description,
        "category": expense.category.value if expense.category else None,
        "status": expense.status.value if expense.status else None,
        "expense_date": expense.expense_date.isoformat() if expense.expense_date else None,
        "created_at": expense.created_at.isoformat() if expense.created_at else None,
        "updated_at": expense.updated_at.isoformat() if expense.updated_at else None,
        "requires_bill": expense.requires_bill,
        "bill_url": expense.bill_url,
        "employee_id": expense.employee_id,
        "created_by": expense.created_by,
        "approver_id": expense.approver_id,
        "employee_name": expense.employee.full_name if expense.employee else None
    }

# Routes
@router.get("/")
def get_all_expenses(
    skip: int = 0,
    limit: int = 100,
    status: Optional[str] = None,
    employee_id: Optional[int] = None,
    db: Session = Depends(get_db)
) -> List[dict]:
    """Get all expenses with optional filtering"""
    query = db.query(Expense)
    
    if status:
        try:
            status_enum = ExpenseStatus[status.upper()]
            query = query.filter(Expense.status == status_enum)
        except KeyError:
            pass
    
    if employee_id:
        query = query.filter(Expense.employee_id == employee_id)
    
    expenses = query.order_by(Expense.created_at.desc()).offset(skip).limit(limit).all()
    return [expense_to_dict(exp) for exp in expenses]

@router.get("/pending")
def get_pending_expenses(db: Session = Depends(get_db)) -> List[dict]:
    """Get all pending expenses requiring approval"""
    expenses = db.query(Expense).filter(
        Expense.status == ExpenseStatus.PENDING
    ).order_by(Expense.created_at.desc()).all()
    return [expense_to_dict(exp) for exp in expenses]

@router.get("/requires-bill")
def get_expenses_requiring_bill(db: Session = Depends(get_db)) -> List[dict]:
    """Get all expenses that require bill upload"""
    expenses = db.query(Expense).filter(
        Expense.requires_bill == True,
        Expense.bill_url.is_(None)
    ).order_by(Expense.created_at.desc()).all()
    return [expense_to_dict(exp) for exp in expenses]

@router.get("/{expense_id}")
def get_expense_by_id(expense_id: int, db: Session = Depends(get_db)) -> dict:
    """Get specific expense by ID"""
    expense = db.query(Expense).filter(Expense.id == expense_id).first()
    if not expense:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Expense not found"
        )
    return expense_to_dict(expense)

@router.post("/", status_code=status.HTTP_201_CREATED)
def create_expense(
    description: str = Form(...),
    amount: float = Form(...),
    category: str = Form(...),
    expense_date: str = Form(...),
    employee_id: int = Form(...),
    created_by: int = Form(...),
    db: Session = Depends(get_db)
) -> dict:
    """Submit a new expense/reimbursement request"""
    # Parse date
    try:
        parsed_date = datetime.fromisoformat(expense_date)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid date format. Use ISO format (YYYY-MM-DD)"
        )
    
    # Validate employee exists
    employee = db.query(Employee).filter(Employee.id == employee_id).first()
    if not employee:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Employee not found"
        )
    
    # Validate user exists
    user = db.query(User).filter(User.id == created_by).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Validate amount cap
    if amount > AUTO_APPROVE_THRESHOLD:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Maximum expense amount is {AUTO_APPROVE_THRESHOLD} INR"
        )
    
    # Validate category
    expense_category = validate_category(category)
    
    # Determine if bill is required and status
    requires_bill = amount >= AUTO_APPROVE_THRESHOLD
    
    if amount < AUTO_APPROVE_THRESHOLD:
        initial_status = ExpenseStatus.AUTO_APPROVED
    else:
        initial_status = ExpenseStatus.PENDING
    
    # Check for duplicate
    existing = db.query(Expense).filter(
        Expense.employee_id == employee_id,
        Expense.description.ilike(f"%{description}%"),
        Expense.expense_date == parsed_date
    ).first()
    
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Duplicate expense description detected for this date"
        )
    
    # Create expense
    new_expense = Expense(
        description=description,
        amount=amount,
        category=expense_category,
        status=initial_status,
        expense_date=parsed_date,
        employee_id=employee_id,
        created_by=created_by,
        requires_bill=requires_bill
    )
    
    db.add(new_expense)
    db.commit()
    db.refresh(new_expense)
    
    return expense_to_dict(new_expense)

@router.post("/{expense_id}/upload-bill")
def upload_bill(
    expense_id: int,
    bill: UploadFile = File(...),
    db: Session = Depends(get_db)
) -> BillUploadResponse:
    """Upload bill/receipt for an expense (Max 10MB)"""
    expense = db.query(Expense).filter(Expense.id == expense_id).first()
    if not expense:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Expense not found"
        )
    
    if not expense.requires_bill:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This expense does not require a bill upload"
        )
    
    # Check file size (10MB limit)
    file_size = 0
    file_content = bill.file.read()
    file_size = len(file_content)
    
    if file_size > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File size exceeds 10MB limit. Your file: {(file_size / (1024*1024)):.2f}MB"
        )
    
    # Validate file type
    allowed_extensions = {".pdf", ".jpg", ".jpeg", ".png"}
    file_ext = Path(bill.filename).suffix.lower()
    if file_ext not in allowed_extensions:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid file type. Allowed: {allowed_extensions}"
        )
    
    # Save file to bill_images directory
    file_name = f"expense_{expense_id}_{datetime.now().strftime('%Y%m%d_%H%M%S')}{file_ext}"
    file_path = BILL_UPLOAD_DIR / file_name
    
    try:
        with open(file_path, "wb") as buffer:
            buffer.write(file_content)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to save bill: {str(e)}"
        )
    
    # Update expense
    expense.bill_url = f"/bill_images/{file_name}"
    expense.bill_path = str(file_path)
    expense.updated_at = datetime.utcnow()
    
    db.commit()
    db.refresh(expense)
    
    return BillUploadResponse(
        message="Bill uploaded successfully",
        expense_id=expense_id,
        bill_url=expense.bill_url
    )

@router.post("/{expense_id}/approve")
def approve_expense(
    expense_id: int,
    approver_id: int,
    db: Session = Depends(get_db)
) -> ActionResponse:
    """Approve an expense"""
    expense = db.query(Expense).filter(Expense.id == expense_id).first()
    if not expense:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Expense not found"
        )
    
    if expense.status == ExpenseStatus.APPROVED:
        return ActionResponse(message="Expense already approved", expense_id=expense_id)
    
    # Check if bill required and uploaded
    if expense.requires_bill and not expense.bill_url:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Bill upload required before approval for expenses >= 6000 INR"
        )
    
    # Validate approver
    approver = db.query(User).filter(User.id == approver_id).first()
    if not approver:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Approver not found"
        )
    
    expense.status = ExpenseStatus.APPROVED
    expense.approver_id = approver_id
    expense.updated_at = datetime.utcnow()
    
    db.commit()
    db.refresh(expense)
    
    return ActionResponse(
        message="Expense approved successfully",
        expense_id=expense_id,
        approved_by=approver_id
    )

@router.post("/{expense_id}/reject")
def reject_expense(
    expense_id: int,
    db: Session = Depends(get_db)
) -> ActionResponse:
    """Reject an expense"""
    expense = db.query(Expense).filter(Expense.id == expense_id).first()
    if not expense:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Expense not found"
        )
    
    if expense.status == ExpenseStatus.REJECTED:
        return ActionResponse(message="Expense already rejected", expense_id=expense_id)
    
    expense.status = ExpenseStatus.REJECTED
    expense.updated_at = datetime.utcnow()
    
    db.commit()
    db.refresh(expense)
    
    return ActionResponse(
        message="Expense rejected",
        expense_id=expense_id
    )

@router.get("/stats/summary")
def get_expense_stats(db: Session = Depends(get_db)) -> StatsResponse:
    """Get expense statistics summary"""
    from sqlalchemy import func
    
    total_expenses = db.query(func.count(Expense.id)).scalar() or 0
    total_amount = db.query(func.sum(Expense.amount)).scalar() or 0
    
    pending_count = db.query(func.count(Expense.id)).filter(
        Expense.status == ExpenseStatus.PENDING
    ).scalar() or 0
    
    approved_count = db.query(func.count(Expense.id)).filter(
        Expense.status == ExpenseStatus.APPROVED
    ).scalar() or 0
    
    auto_approved_count = db.query(func.count(Expense.id)).filter(
        Expense.status == ExpenseStatus.AUTO_APPROVED
    ).scalar() or 0
    
    rejected_count = db.query(func.count(Expense.id)).filter(
        Expense.status == ExpenseStatus.REJECTED
    ).scalar() or 0
    
    pending_bills = db.query(func.count(Expense.id)).filter(
        Expense.requires_bill == True,
        Expense.bill_url.is_(None)
    ).scalar() or 0
    
    return StatsResponse(
        total_expenses=total_expenses,
        total_amount=float(total_amount),
        pending_count=pending_count,
        approved_count=approved_count,
        auto_approved_count=auto_approved_count,
        rejected_count=rejected_count,
        pending_bills=pending_bills
    )
