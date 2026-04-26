from sqlalchemy import create_engine, Column, Integer, Float, String, Boolean, DateTime, ForeignKey, Enum as SQLEnum, Numeric, Text
from sqlalchemy.orm import declarative_base, sessionmaker, relationship
from datetime import datetime
import os
from enum import Enum as PyEnum

# Create Enum types for Python
class ExpenseCategory(PyEnum):
    FOOD = "FOOD"
    TRANSPORTATION = "TRANSPORTATION"
    OFFICE_SUPPLIES = "OFFICE_SUPPLIES"
    MEETINGS = "MEETINGS"
    CONFERENCES = "CONFERENCES"
    TRAVEL = "TRAVEL"
    OTHER = "OTHER"

class ExpenseStatus(PyEnum):
    PENDING = "PENDING"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"
    AUTO_APPROVED = "AUTO_APPROVED"

# Database configuration - Use SQLite for easy testing
# For production, change this to your PostgreSQL URL
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./reimbursement.db")

# Handle SQLite vs PostgreSQL
if DATABASE_URL.startswith("sqlite"):
    engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
else:
    engine = create_engine(DATABASE_URL)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# Dependency to get DB session
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# ============================================
# USER MODEL
# ============================================
class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    username = Column(String(100), nullable=False)
    email = Column(String(255), unique=True, nullable=False)
    password = Column(String(255), nullable=False)
    is_admin = Column(Boolean, default=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def __repr__(self):
        return f"<User(id={self.id}, email={self.email})>"

# ============================================
# EMPLOYEE MODEL
# ============================================
class Employee(Base):
    __tablename__ = "employees"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    first_name = Column(String(100), nullable=False)
    last_name = Column(String(100), nullable=False)
    email = Column(String(255), unique=True, nullable=False)
    salary = Column(Numeric(10, 2), nullable=True)
    department = Column(String(100), nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    expenses = relationship("Expense", back_populates="employee")

    def __repr__(self):
        return f"<Employee(id={self.id}, email={self.email})>"

    @property
    def full_name(self):
        return f"{self.first_name} {self.last_name}"

# ============================================
# EXPENSE MODEL (Reimbursement Request)
# ============================================
class Expense(Base):
    __tablename__ = "expenses"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    amount = Column(Numeric(10, 2), nullable=False)
    description = Column(String(500), nullable=True)
    category = Column(SQLEnum(ExpenseCategory), nullable=False)
    status = Column(SQLEnum(ExpenseStatus), default=ExpenseStatus.PENDING)
    expense_date = Column(DateTime, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Bill upload for expenses > 6000
    bill_url = Column(String(500), nullable=True)
    bill_path = Column(String(500), nullable=True)
    requires_bill = Column(Boolean, default=False)
    
    # Foreign Keys
    employee_id = Column(Integer, ForeignKey("employees.id"), nullable=False)
    created_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    approver_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    
    # Relationships
    employee = relationship("Employee", back_populates="expenses")

    def __repr__(self):
        return f"<Expense(id={self.id}, amount={self.amount}, status={self.status.value})>"

    def to_dict(self):
        """Convert expense to dictionary for JSON serialization"""
        return {
            "id": self.id,
            "amount": float(self.amount) if self.amount else 0,
            "description": self.description,
            "category": self.category.value if self.category else None,
            "status": self.status.value if self.status else None,
            "expense_date": self.expense_date.isoformat() if self.expense_date else None,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
            "requires_bill": self.requires_bill,
            "bill_url": self.bill_url,
            "employee_id": self.employee_id,
            "created_by": self.created_by,
            "approver_id": self.approver_id,
            "employee_name": self.employee.full_name if self.employee else None
        }

# ============================================
# NOTIFICATION MODEL
# ============================================
class Notification(Base):
    __tablename__ = "notifications"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    recipient_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    title = Column(String(200), nullable=True)
    message = Column(Text, nullable=False)
    is_read = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    def __repr__(self):
        return f"<Notification(id={self.id}, recipient_id={self.recipient_id})>"

    def to_dict(self):
        return {
            "id": self.id,
            "recipient_id": self.recipient_id,
            "title": self.title,
            "message": self.message,
            "is_read": self.is_read,
            "created_at": self.created_at.isoformat() if self.created_at else None
        }
