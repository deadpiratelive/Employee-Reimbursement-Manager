"""
Authentication Routes
"""
from fastapi import APIRouter, HTTPException, Depends, status
from sqlalchemy.orm import Session
from pydantic import BaseModel, field_validator, ConfigDict
from passlib.context import CryptContext
from datetime import datetime, timedelta
from typing import Optional, List

from models import User, get_db

router = APIRouter()

# Configure bcrypt with proper settings - single instance
pwd_context = CryptContext(
    schemes=["bcrypt"],
    deprecated="auto"
)

# Password length validation
MAX_PASSWORD_LENGTH = 71  # bcrypt max is 72 bytes

# Pydantic models
class UserCreate(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    username: str
    email: str
    password: str
    is_admin: bool = False

    @field_validator('email')
    @classmethod
    def validate_email(cls, v: str) -> str:
        if '@' not in v or '.' not in v:
            raise ValueError('Invalid email format')
        return v

class UserLogin(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    email: str
    password: str

class UserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    username: str
    email: str
    is_admin: bool
    is_active: bool

class TokenResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    message: str
    user: UserResponse

# Helper functions
def hash_password(password: str) -> str:
    """Hash password with bcrypt, handling long passwords"""
    # bcrypt has a 72 byte limit
    password_bytes = password.encode('utf-8')
    if len(password_bytes) > MAX_PASSWORD_LENGTH:
        password_bytes = password_bytes[:MAX_PASSWORD_LENGTH]
    return pwd_context.hash(password_bytes)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify password against hash"""
    try:
        return pwd_context.verify(plain_password, hashed_password)
    except Exception:
        return False

# Routes
@router.post("/register", response_model=TokenResponse)
def register_user(user_data: UserCreate, db: Session = Depends(get_db)):
    """Register a new user (admin or employee)"""
    # Check if email exists
    existing_user = db.query(User).filter(User.email == user_data.email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    # Validate email format
    if '@' not in user_data.email or '.' not in user_data.email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid email format"
        )
    
    # Validate password length
    if len(user_data.password) < 6:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password must be at least 6 characters"
        )
    
    # Create new user
    new_user = User(
        username=user_data.username,
        email=user_data.email,
        password=hash_password(user_data.password),
        is_admin=user_data.is_admin
    )
    
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    return TokenResponse(
        message="User registered successfully",
        user=UserResponse.model_validate(new_user)
    )

@router.post("/login", response_model=TokenResponse)
def login_user(login_data: UserLogin, db: Session = Depends(get_db)):
    """Login user"""
    user = db.query(User).filter(User.email == login_data.email).first()
    
    if not user or not verify_password(login_data.password, user.password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials"
        )
    
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is deactivated"
        )
    
    return TokenResponse(
        message="Login successful",
        user=UserResponse.model_validate(user)
    )

@router.get("/me", response_model=UserResponse)
def get_current_user_info(user_id: int, db: Session = Depends(get_db)):
    """Get current user info"""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    return UserResponse.model_validate(user)

@router.get("/users", response_model=List[UserResponse])
def get_all_users(db: Session = Depends(get_db)):
    """Get all users"""
    users = db.query(User).all()
    return users
