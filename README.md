# ReimburseSys

<div align="center">

**Enterprise Expense Reimbursement Management System**

[![FastAPI](https://img.shields.io/badge/FastAPI-009688?style=flat-square&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![Next.js](https://img.shields.io/badge/Next.js-000000?style=flat-square&logo=next.js&logoColor=white)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-06B6D4?style=flat-square&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![SQLite](https://img.shields.io/badge/SQLite-003B57?style=flat-square&logo=sqlite&logoColor=white)](https://sqlite.org/)

</div>

---

## 📋 Table of Contents

- [Overview](#overview)
- [System Architecture](#system-architecture)
- [Quick Start](#quick-start)
- [System Requirements](#system-requirements)
- [Installation](#installation)
- [Configuration](#configuration)
- [Workflow Guide](#workflow-guide)
- [API Reference](#api-reference)
- [Upcoming Features](#upcoming-features)
- [Troubleshooting](#troubleshooting)

---

## Overview

**ReimburseSys** is a full-stack expense reimbursement platform designed for enterprise teams. It streamlines the process of submitting, reviewing, and approving employee expenses with an intelligent auto-approval system and bill verification workflow.

### Key Features

| Feature | Description |
|---------|-------------|
| **Auto-Approval** | Expenses under ₹6,000 are automatically approved |
| **Bill Verification** | Expenses ≥ ₹6,000 require receipt upload for approval |
| **Real-time Dashboard** | Visual analytics and expense tracking |
| **Role-based Access** | Separate views for employees and administrators |
| **Mobile Responsive** | Dark-themed UI optimized for all devices |

---

## System Architecture

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   Next.js 14    │────▶│   FastAPI        │────▶│    SQLite       │
│   (Frontend)    │     │   (Backend)      │     │   (Database)    │
│   Port: 3000    │◀────│   Port: 8000     │◀────│   File Storage  │
└─────────────────┘     └──────────────────┘     └─────────────────┘
         │                                               │
         │          ┌─────────────────────┐               │
         └─────────▶│   Bill Images       │◀─────────────┘
                    │   (Local Storage)   │
                    └─────────────────────┘
```

### Tech Stack

| Layer | Technology | Version |
|-------|------------|---------|
| **Frontend** | Next.js + React + TypeScript | 14.2+ |
| **Styling** | Tailwind CSS + Custom CSS | 3.3+ |
| **Forms** | React Hook Form + Zod | 7.49+ |
| **Backend** | FastAPI + Python | 3.10+ |
| **Database** | SQLAlchemy + SQLite | 2.0+ |
| **Auth** | Passlib (bcrypt) | 4.0.1 |

---

## Quick Start

### One-Command Launch (Windows)

```powershell
# Double-click in File Explorer
launch.bat
```

### Manual Start

```powershell
# Terminal 1 - Backend
cd backend
.\venv\Scripts\activate
uvicorn main:app --reload

# Terminal 2 - Frontend
cd frontend
npm run dev
```

Access the application:
- **Frontend**: http://localhost:3000
- **API**: http://localhost:8000
- **API Docs**: http://localhost:8000/docs

---

## System Requirements

### Software

| Software | Minimum Version | Download |
|----------|----------------|----------|
| Python | 3.10+ | [python.org](https://python.org) |
| Node.js | 18+ | [nodejs.org](https://nodejs.org) |
| Git | 2.30+ | [git-scm.com](https://git-scm.com) |

### Hardware

| Resource | Minimum | Recommended |
|----------|---------|-------------|
| RAM | 4 GB | 8 GB |
| Storage | 500 MB | 2 GB |
| CPU | Dual-core | Quad-core |

### Browser Support

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

---

## Installation

### 1. Clone Repository

```powershell
git clone <repository-url>
cd Employee-Reimbursement-Manager
```

### 2. Backend Setup

```powershell
cd backend

# Create virtual environment
python -m venv venv

# Activate (Windows)
.\venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt
```

**Dependencies (`requirements.txt`)**:
```
fastapi>=0.104.0
uvicorn[standard]>=0.24.0
sqlalchemy>=2.0.0
bcrypt==4.0.1
python-dotenv>=1.0.0
pydantic>=2.5.0
pydantic[email]>=2.5.0
python-multipart>=0.0.6
```

### 3. Frontend Setup

```powershell
cd frontend
npm install
```

**Key Dependencies**:
```json
{
  "next": "^14.2.35",
  "react": "18.2.0",
  "typescript": "5.3.3",
  "tailwindcss": "^3.3.0",
  "axios": "^1.15.2",
  "react-hook-form": "7.49.1",
  "zod": "3.22.4",
  "lucide-react": "^1.11.0"
}
```

### 4. Seed Test Data (Optional)

```powershell
cd backend
python seed_data.py
```

Creates 10 employees + 1 admin with credentials:
- **Regular Users**: `john.smith@company.com` / `password123` (IDs 1-10)
- **Admin**: `admin@company.com` / `admin123`

---

## Configuration

### Environment Variables

Create `backend/.env`:

```env
# Database (SQLite default - no setup required)
DATABASE_URL=sqlite:///./reimbursement.db

# For PostgreSQL (optional):
# DATABASE_URL=postgresql://user:password@localhost:5432/reimbursement_db

# File Storage
UPLOAD_DIR=./bill_images
MAX_FILE_SIZE=10485760

# Server
HOST=0.0.0.0
PORT=8000
```

### File Upload Settings

| Setting | Value | Description |
|---------|-------|-------------|
| Max File Size | 10 MB | Per receipt upload |
| Allowed Types | PDF, JPG, JPEG, PNG | Bill formats |
| Storage Path | `backend/bill_images/` | Local storage |
| Naming Pattern | `expense_{id}_{timestamp}.{ext}` | Auto-generated |

---

## Workflow Guide

### Employee Workflow

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   Login     │───▶│ Submit      │───▶│   Upload    │───▶│   Track     │
│             │    │ Expense     │    │   Bill      │    │   Status    │
└─────────────┘    │ (if ≥₹6000) │    │  (if ≥₹6000)│    └─────────────┘
                   └─────────────┘    └─────────────┘
```

**Steps**:
1. **Login** → Use employee credentials
2. **Submit Expense** → Enter amount, category, description
3. **Upload Bill** → Required for expenses ≥ ₹6,000
4. **Track Status** → View real-time approval status

### Admin Workflow

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   Login     │───▶│  Review     │───▶│ Approve/    │
│             │    │  Pending    │    │ Reject      │
└─────────────┘    └─────────────┘    └─────────────┘
```

**Steps**:
1. **Login** → Use admin credentials
2. **Review Dashboard** → See pending approvals and statistics
3. **View Expenses** → Filter by status, category, employee
4. **Take Action** → Approve or reject with bill verification

### Reimbursement Rules

| Expense Amount | Bill Required | Approval Type | Status |
|---------------|---------------|---------------|--------|
| < ₹6,000 | No | Automatic | `AUTO_APPROVED` |
| ≥ ₹6,000 | Yes | Manual | `PENDING` → `APPROVED` |
| Any | - | Manager Decision | `REJECTED` |

---

## API Reference

### Authentication

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Create user account |
| POST | `/api/auth/login` | Authenticate user |
| GET | `/api/auth/me` | Get current user |

### Employees

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/employees/` | List all employees |
| POST | `/api/employees/` | Create employee |
| GET | `/api/employees/{id}` | Get employee details |
| PUT | `/api/employees/{id}` | Update employee |
| DELETE | `/api/employees/{id}` | Deactivate employee |

### Expenses

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/expenses/` | List all expenses |
| POST | `/api/expenses/` | Submit expense |
| GET | `/api/expenses/pending` | Get pending list |
| POST | `/api/expenses/{id}/upload-bill` | Upload receipt |
| POST | `/api/expenses/{id}/approve` | Approve expense |
| POST | `/api/expenses/{id}/reject` | Reject expense |

### Dashboard

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/dashboard/summary` | Statistics summary |
| GET | `/api/dashboard/recent` | Recent activity |

---

## Upcoming Features

Based on user feedback and enterprise needs, the following features are planned:

### Priority 1: Employee Experience

| Feature | Description | Status |
|---------|-------------|--------|
| **Email Notifications** | Automated emails for approval/rejection updates | 🚧 Planned |
| **Expense History** | Personal dashboard with filtering and search | 🚧 Planned |
| **Mobile Receipt Capture** | Direct camera integration for bill photos | 📋 Backlog |

### Priority 2: Admin Tools

| Feature | Description | Status |
|---------|-------------|--------|
| **Bulk Actions** | Approve/reject multiple expenses at once | 🚧 Planned |
| **Export Reports** | Excel/PDF export for accounting | 🚧 Planned |
| **Analytics Charts** | Visual spending breakdowns by category/month | 🚧 Planned |
| **Department Managers** | Assign managers to specific departments | 📋 Backlog |

### Priority 3: System Enhancements

| Feature | Description | Status |
|---------|-------------|--------|
| **Multi-currency** | Support for USD, EUR, GBP, etc. | 📋 Backlog |
| **OCR Receipt Scan** | Auto-extract data from receipt images | 📋 Backlog |
| **Accounting Integration** | QuickBooks, SAP, Tally connectors | 📋 Backlog |
| **Role-based Access** | Granular permissions (viewer, reviewer, admin) | 📋 Backlog |

### Community Suggestions

- [ ] Reimbursement payment tracking
- [ ] Recurring expense templates
- [ ] Policy compliance checker
- [ ] Expense forecasting

---

## Troubleshooting

### Common Issues

**1. Database Connection Error**
```
Error: sqlite3.OperationalError: unable to open database file
```
**Solution**: Ensure `backend/` directory has write permissions.

**2. Port Already in Use**
```
Error: [Errno 98] Address already in use
```
**Solution**: 
```powershell
# Kill process on port 8000 (Windows)
netstat -ano | findstr :8000
taskkill /PID <PID> /F
```

**3. bcrypt Version Error**
```
Error: password cannot be longer than 72 bytes
```
**Solution**: Ensure bcrypt==4.0.1 is installed:
```powershell
pip install bcrypt==4.0.1
```

**4. Frontend Not Loading Dark Theme**
```
Symptom: White background instead of dark
```
**Solution**: Clear Next.js cache:
```powershell
cd frontend
Remove-Item -Recurse -Force .next
npm run build
```

### Getting Help

- **API Issues**: Check `http://localhost:8000/docs`
- **Frontend Errors**: Check browser DevTools console
- **Database**: Inspect `backend/reimbursement.db` with SQLite browser

---

## Development

### Project Structure

```
Employee-Reimbursement-Manager/
├── backend/
│   ├── main.py              # FastAPI entry point
│   ├── models.py            # Database models
│   ├── routes/
│   │   ├── auth.py          # Authentication
│   │   ├── employee.py      # Employee management
│   │   ├── expense.py       # Expense workflows
│   │   └── dashboard.py     # Analytics
│   ├── seed_data.py         # Test data generator
│   └── requirements.txt     # Python deps
├── frontend/
│   ├── src/app/
│   │   ├── page.tsx         # Main dashboard
│   │   ├── layout.tsx       # Root layout
│   │   └── globals.css      # Dark theme styles
│   ├── package.json         # Node deps
│   └── tailwind.config.js   # Tailwind setup
├── launch.bat               # One-click launcher
├── push-to-github.bat       # Git push helper
└── README.md                # This file
```

### Database Schema

```
users
├── id (PK)
├── username
├── email
├── password (bcrypt hashed)
├── is_admin
└── is_active

employees
├── id (PK)
├── first_name
├── last_name
├── email
├── salary
├── department
└── is_active

expenses
├── id (PK)
├── amount
├── description
├── category (FOOD, TRAVEL, etc.)
├── status (PENDING, APPROVED, etc.)
├── bill_url
├── requires_bill
├── employee_id (FK)
└── created_by (FK)
```

---

## License

This project is developed for educational and enterprise use.

---

<div align="center">

**Built with modern web technologies**

[⬆ Back to Top](#reimbursesys)

</div>
