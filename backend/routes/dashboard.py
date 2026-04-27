"""
Dashboard Routes - Statistics and Summary
"""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from pydantic import BaseModel, ConfigDict
from typing import Optional

from models import get_db, Expense, Employee, ExpenseStatus

router = APIRouter()

# Pydantic models
class DashboardSummary(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    total_expenses: int
    total_amount: float
    pending_count: int
    approved_count: int
    auto_approved_count: int
    rejected_count: int
    pending_bills: int

class DashboardResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    summary: DashboardSummary

@router.get("/summary")
def get_dashboard_summary(db: Session = Depends(get_db)) -> DashboardResponse:
    """Get dashboard statistics summary"""
    # Total expenses count
    total_expenses = db.query(func.count(Expense.id)).scalar() or 0
    
    # Total amount of all expenses
    total_amount = db.query(func.sum(Expense.amount)).scalar() or 0
    
    # Count by status
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
    
    # Expenses requiring bill but not yet uploaded
    pending_bills = db.query(func.count(Expense.id)).filter(
        Expense.requires_bill == True,
        Expense.bill_url.is_(None)
    ).scalar() or 0
    
    summary = DashboardSummary(
        total_expenses=total_expenses,
        total_amount=float(total_amount),
        pending_count=pending_count,
        approved_count=approved_count,
        auto_approved_count=auto_approved_count,
        rejected_count=rejected_count,
        pending_bills=pending_bills
    )
    
    return DashboardResponse(summary=summary)


@router.get("/recent")
def get_recent_activity(limit: int = 5, db: Session = Depends(get_db)):
    """Get recent expense activity"""
    expenses = db.query(Expense).order_by(Expense.created_at.desc()).limit(limit).all()
    
    return {
        "activities": [
            {
                "id": exp.id,
                "description": exp.description,
                "amount": float(exp.amount) if exp.amount else 0.0,
                "status": exp.status.value if exp.status else None,
                "category": exp.category.value if exp.category else None,
                "employee_name": exp.employee.full_name if exp.employee else f"Employee #{exp.employee_id}",
                "created_at": exp.created_at.isoformat() if exp.created_at else None,
            }
            for exp in expenses
        ]
    }


@router.get("/employee-stats")
def get_employee_statistics(db: Session = Depends(get_db)):
    """Get expense statistics per employee"""
    employees = db.query(Employee).filter(Employee.is_active == True).all()
    
    stats = []
    for emp in employees:
        emp_expenses = emp.expenses
        total = len(emp_expenses)
        total_amount = sum(float(exp.amount) for exp in emp_expenses)
        pending = len([e for e in emp_expenses if e.status.value == "PENDING"])
        
        stats.append({
            "employee_id": emp.id,
            "employee_name": emp.full_name,
            "total_expenses": total,
            "total_amount": total_amount,
            "pending_count": pending
        })
    
    return {"employees": stats}


@router.get("/category-breakdown")
def get_category_breakdown(db: Session = Depends(get_db)):
    """Get expense breakdown by category"""
    from sqlalchemy import func
    
    results = db.query(
        Expense.category,
        func.count(Expense.id).label('count'),
        func.sum(Expense.amount).label('total')
    ).group_by(Expense.category).all()
    
    return {
        "breakdown": [
            {
                "category": cat.value if cat else "Unknown",
                "count": count,
                "total": float(total) if total else 0.0
            }
            for cat, count, total in results
        ]
    }
