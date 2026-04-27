"""
Database Seeding Script - Create test users and employees
Run: python seed_data.py
"""
import os
import sys
from pathlib import Path

# Add backend to path
backend_dir = Path(__file__).parent
sys.path.insert(0, str(backend_dir))

from sqlalchemy.orm import Session
from models import User, Employee, SessionLocal, engine, Base
from routes.auth import hash_password

def seed_database():
    """Seed database with test users and employees"""
    
    # Create tables if they don't exist
    Base.metadata.create_all(bind=engine)
    
    db = SessionLocal()
    
    try:
        # Check if users already exist
        existing_users = db.query(User).count()
        if existing_users > 0:
            print(f"Database already has {existing_users} users. Skip seeding? (y/n)")
            response = input().lower()
            if response != 'y':
                print("Seeding cancelled.")
                return
        
        print("Seeding database with test data...")
        
        # Create 10 regular users (employees)
        users_data = [
            {"username": "John Smith", "email": "john.smith@company.com", "password": "password123"},
            {"username": "Sarah Johnson", "email": "sarah.johnson@company.com", "password": "password123"},
            {"username": "Michael Chen", "email": "michael.chen@company.com", "password": "password123"},
            {"username": "Emily Davis", "email": "emily.davis@company.com", "password": "password123"},
            {"username": "Robert Wilson", "email": "robert.wilson@company.com", "password": "password123"},
            {"username": "Lisa Anderson", "email": "lisa.anderson@company.com", "password": "password123"},
            {"username": "David Martinez", "email": "david.martinez@company.com", "password": "password123"},
            {"username": "Jennifer Taylor", "email": "jennifer.taylor@company.com", "password": "password123"},
            {"username": "James Brown", "email": "james.brown@company.com", "password": "password123"},
            {"username": "Maria Garcia", "email": "maria.garcia@company.com", "password": "password123"},
        ]
        
        created_users = []
        for user_data in users_data:
            # Check if user already exists
            existing = db.query(User).filter(User.email == user_data["email"]).first()
            if existing:
                print(f"  [SKIP] User {user_data['email']} already exists")
                created_users.append(existing)
                continue
            
            new_user = User(
                username=user_data["username"],
                email=user_data["email"],
                password=hash_password(user_data["password"]),
                is_admin=False,
                is_active=True
            )
            db.add(new_user)
            created_users.append(new_user)
            print(f"  [OK] Created user: {user_data['username']} ({user_data['email']})")
        
        db.commit()
        
        # Create 10 employees linked to the users
        departments = ["Engineering", "Sales", "Marketing", "HR", "Finance", "Operations", "Design", "Product", "Support", "Legal"]
        
        for i, user in enumerate(created_users):
            # Check if employee already exists for this user
            existing_emp = db.query(Employee).filter(Employee.email == user.email).first()
            if existing_emp:
                print(f"  [SKIP] Employee for {user.email} already exists")
                continue
            
            first_name = user.username.split()[0]
            last_name = user.username.split()[-1] if len(user.username.split()) > 1 else ""
            
            employee = Employee(
                first_name=first_name,
                last_name=last_name,
                email=user.email,
                salary=50000 + (i * 5000),
                department=departments[i % len(departments)],
                is_active=True
            )
            db.add(employee)
            print(f"  [OK] Created employee: {first_name} {last_name} ({departments[i % len(departments)]})")
        
        db.commit()
        
        # Create 1 admin user
        admin_email = "admin@company.com"
        existing_admin = db.query(User).filter(User.email == admin_email).first()
        if not existing_admin:
            admin_user = User(
                username="Admin User",
                email=admin_email,
                password=hash_password("admin123"),
                is_admin=True,
                is_active=True
            )
            db.add(admin_user)
            
            admin_employee = Employee(
                first_name="Admin",
                last_name="User",
                email=admin_email,
                salary=100000,
                department="Management",
                is_active=True
            )
            db.add(admin_employee)
            
            db.commit()
            print(f"  [OK] Created admin user: {admin_email} (password: admin123)")
        else:
            print(f"  [SKIP] Admin user already exists")
        
        print("\n=== Database seeding completed! ===")
        print("\nTest Accounts:")
        print("  Regular Users (password: 'password123'):")
        for user_data in users_data:
            print(f"    - {user_data['email']}")
        print("\n  Admin User (password: 'admin123'):")
        print(f"    - {admin_email}")
        print("\nTip: Use employee_id 1-10 when submitting expenses")
        
    except Exception as e:
        print(f"[ERROR] Error seeding database: {e}")
        db.rollback()
        raise
    finally:
        db.close()

if __name__ == "__main__":
    seed_database()
