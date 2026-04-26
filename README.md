# Employee Reimbursement Manager

A complete Employee Expense Reimbursement Management System built with FastAPI (backend) and Next.js (frontend).

## Project Overview

This system allows employees to submit expense reimbursement requests for business-related activities (meetings, conferences, travel, etc.). The reimbursement process follows these rules:

- **Expenses < ₹6000**: Auto-approved without bill requirement
- **Expenses ≥ ₹6000**: Requires bill upload for manager approval

## Tech Stack

### Backend
- **Framework**: FastAPI
- **Database**: PostgreSQL with SQLAlchemy ORM
- **Authentication**: Password hashing with bcrypt
- **File Upload**: Support for PDF, JPG, JPEG, PNG

### Frontend
- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Forms**: React Hook Form + Zod validation
- **HTTP Client**: Axios

## Project Structure

```
Employee-Reimbursement-Manager/
├── backend/
│   ├── main.py                 # FastAPI application entry point
│   ├── models.py               # SQLAlchemy database models
│   ├── .env                    # Environment variables
│   ├── requirements.txt        # Python dependencies
│   └── routes/
│       ├── __init__.py
│       ├── auth.py             # Authentication routes
│       ├── employee.py         # Employee management routes
│       ├── expense.py          # Expense/reimbursement routes
│       └── dashboard.py        # Dashboard statistics routes
├── frontend/
│   ├── src/app/
│   │   ├── page.tsx           # Main application page
│   │   ├── layout.tsx         # Root layout
│   │   └── globals.css        # Global styles
│   ├── package.json           # Node.js dependencies
│   ├── tsconfig.json          # TypeScript configuration
│   └── next.config.js         # Next.js configuration
└── README.md                  # This file
```

## Database Schema

### Tables
1. **users** - Admin/manager accounts
2. **employees** - Employee information
3. **expenses** - Reimbursement requests with status tracking
4. **notifications** - System notifications

### Expense Status Flow
- `PENDING` → Requires bill upload + manager approval (for ≥ ₹6000)
- `AUTO_APPROVED` → Automatic approval (< ₹6000)
- `APPROVED` → Manager approved
- `REJECTED` → Manager rejected

## Setup Instructions

### Prerequisites
- Python 3.10+
- PostgreSQL 14+
- Node.js 18+

### Backend Setup

1. **Navigate to backend directory:**
   ```bash
   cd Employee-Reimbursement-Manager/backend
   ```

2. **Create virtual environment:**
   ```bash
   python -m venv venv
   venv\Scripts\activate  # Windows
   source venv/bin/activate  # Linux/Mac
   ```

3. **Install Python dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

4. **Configure PostgreSQL database:**
   - Create a database named `reimbursement_db`
   - Update `.env` file with your database credentials

5. **Run the backend server:**
   ```bash
   uvicorn main:app --reload --host 0.0.0.0 --port 8000
   ```

   The API will be available at `http://localhost:8000`

### Frontend Setup

1. **Navigate to frontend directory:**
   ```bash
   cd Employee-Reimbursement-Manager/frontend
   ```

2. **Install Node.js dependencies:**
   ```bash
   npm install
   ```

3. **Run the development server:**
   ```bash
   npm run dev
   ```

   The frontend will be available at `http://localhost:3000`

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Get current user info

### Employees
- `GET /api/employees/` - List all employees
- `POST /api/employees/` - Create new employee
- `GET /api/employees/{id}` - Get employee details
- `PUT /api/employees/{id}` - Update employee
- `DELETE /api/employees/{id}` - Deactivate employee
- `GET /api/employees/{id}/stats` - Get employee expense statistics

### Expenses
- `GET /api/expenses/` - List all expenses
- `POST /api/expenses/` - Submit new expense
- `GET /api/expenses/pending` - Get pending expenses
- `GET /api/expenses/{id}` - Get expense details
- `POST /api/expenses/{id}/upload-bill` - Upload bill for expense
- `POST /api/expenses/{id}/approve` - Approve expense
- `POST /api/expenses/{id}/reject` - Reject expense
- `GET /api/expenses/stats/summary` - Get expense statistics

### Dashboard
- `GET /api/dashboard/summary` - Get dashboard summary
- `GET /api/dashboard/recent-activity` - Get recent expenses
- `GET /api/dashboard/expenses-by-category` - Get category breakdown
- `GET /api/dashboard/monthly-report` - Get monthly report
- `GET /api/dashboard/top-employees` - Get top spending employees
- `GET /api/dashboard/pending-approvals` - Get pending approvals

## Usage Guide

### 1. Create an Admin/User
First, register a user account:
```bash
curl -X POST "http://localhost:8000/api/auth/register" \
  -H "Content-Type: application/json" \
  -d '{"username": "admin", "email": "admin@company.com", "password": "password123", "is_admin": true}'
```

### 2. Create an Employee
```bash
curl -X POST "http://localhost:8000/api/employees/" \
  -H "Content-Type: application/json" \
  -d '{"first_name": "John", "last_name": "Doe", "email": "john@company.com", "department": "Sales"}'
```

### 3. Submit an Expense
#### Auto-approved (under ₹6000):
```bash
curl -X POST "http://localhost:8000/api/expenses/" \
  -F "description=Business lunch" \
  -F "amount=2500" \
  -F "category=FOOD" \
  -F "expense_date=2024-01-15" \
  -F "employee_id=1" \
  -F "created_by=1"
```

#### Pending approval (₹6000+):
```bash
curl -X POST "http://localhost:8000/api/expenses/" \
  -F "description=Conference travel" \
  -F "amount=8000" \
  -F "category=TRAVEL" \
  -F "expense_date=2024-01-15" \
  -F "employee_id=1" \
  -F "created_by=1"
```

### 4. Upload Bill for Large Expense
```bash
curl -X POST "http://localhost:8000/api/expenses/2/upload-bill" \
  -F "bill=@/path/to/receipt.pdf"
```

### 5. Approve/Reject Expense
```bash
# Approve
curl -X POST "http://localhost:8000/api/expenses/2/approve?approver_id=1"

# Reject
curl -X POST "http://localhost:8000/api/expenses/2/reject"
```

## File Upload Configuration

- **Allowed Formats**: PDF, JPG, JPEG, PNG
- **Storage Location**: `backend/uploads/bills/`
- **File Naming**: `expense_{id}_{timestamp}.{ext}`

## Key Features

1. **Automatic Approval**: Expenses under ₹6000 are auto-approved
2. **Bill Management**: Upload bills for expenses ≥ ₹6000
3. **Dashboard**: Visual overview of expenses and statistics
4. **Category Tracking**: Categorize expenses (Food, Travel, Meetings, etc.)
5. **Employee Management**: Add and manage employee records
6. **Expense History**: View all expenses with filtering options
7. **Approval Workflow**: Manager approval for high-value expenses

## Troubleshooting

### Database Connection Error
Ensure PostgreSQL is running and `.env` has correct credentials:
```
DATABASE_URL="postgresql://user:password@localhost:5432/reimbursement_db?schema=public"
```

### Port Already in Use
- Backend: Change `PORT` in `.env`
- Frontend: Use `npm run dev -- -p 3001` to use different port

### Import Errors
Ensure virtual environment is activated and dependencies are installed:
```bash
pip install -r requirements.txt
```

## Development

### Running Tests
```bash
# Backend tests (if available)
cd backend
pytest

# Frontend linting
cd frontend
npm run lint
```

### Database Migrations
Since the system uses SQLAlchemy with `create_all()`, tables are created automatically. For production, consider using Alembic for migrations.

## License

This project is for educational purposes.

## Support

For issues or questions, please refer to the code documentation or create an issue in the repository.
