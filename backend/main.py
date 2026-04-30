"""
Employee Reimbursement Manager - Main Application
"""
import sys
import os
from pathlib import Path

# Load environment variables first
from dotenv import load_dotenv
env_path = Path(__file__).parent / ".env"
load_dotenv(dotenv_path=env_path)

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, HTMLResponse, FileResponse
from fastapi.staticfiles import StaticFiles
import uvicorn
from pathlib import Path

# Import database models and create tables
from models import Base, engine

# Import routers
from routes.employee import router as employee_router
from routes.expense import router as expense_router
from routes.dashboard import router as dashboard_router
from routes.auth import router as auth_router

# Create database tables
Base.metadata.create_all(bind=engine)

# Create necessary directories
uploads_dir = Path(__file__).parent / "uploads" / "bills"
uploads_dir.mkdir(parents=True, exist_ok=True)

bill_images_dir = Path(__file__).parent / "bill_images"
bill_images_dir.mkdir(parents=True, exist_ok=True)

# Create FastAPI app
app = FastAPI(
    title="Employee Reimbursement Manager",
    description="API for managing employee expense reimbursements",
    version="1.0.0"
)

# Mount directories for serving files
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")
app.mount("/bill_images", StaticFiles(directory="bill_images"), name="bill_images")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://reimbursesys.netlify.app",
        "http://localhost:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global exception handler
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    return JSONResponse(
        status_code=500,
        content={"detail": str(exc), "type": type(exc).__name__}
    )

# Admin Panel - Serve at root
@app.get("/", response_class=HTMLResponse)
async def admin_panel():
    """Serve admin control panel at root"""
    admin_html = Path(__file__).parent / "templates" / "admin.html"
    if admin_html.exists():
        return FileResponse(admin_html)
    return HTMLResponse(content="<h1>Admin Panel Loading...</h1>")

# API status endpoint
@app.get("/api/status")
async def api_status():
    return {
        "message": "Employee Reimbursement Manager API",
        "version": "1.0.0",
        "status": "running"
    }

# Health check
@app.get("/health")
async def health_check():
    return {"status": "healthy", "database": "connected"}

# Include routers
app.include_router(auth_router, prefix="/api/auth", tags=["Authentication"])
app.include_router(employee_router, prefix="/api/employees", tags=["Employees"])
app.include_router(expense_router, prefix="/api/expenses", tags=["Expenses"])
app.include_router(dashboard_router, prefix="/api/dashboard", tags=["Dashboard"])

# Run server
if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True
    )
