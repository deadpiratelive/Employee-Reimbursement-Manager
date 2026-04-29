# 🚀 Deployment Guide

Deploy your Employee Reimbursement Manager to the cloud!

## 📋 Overview

This project deploys to **two** platforms:
- **Frontend** → Netlify (Free)
- **Backend** → Render (Free)

## Step 1: Deploy Backend to Render

### 1.1 Create Account
1. Go to [render.com](https://render.com)
2. Sign up with your GitHub account

### 1.2 Create New Web Service
1. Click **"New +"** → **"Web Service"**
2. Connect your GitHub repository: `Employee-Reimbursement-Manager`
3. Configure:

```
Name: employee-reimbursement-api
Environment: Python 3
Build Command: pip install -r requirements.txt
Start Command: uvicorn main:app --host 0.0.0.0 --port $PORT
```

### 1.3 Set Environment Variables
In Render dashboard, go to **Environment** tab and add:

```
DATABASE_URL = sqlite:///./reimbursement.db
# OR for PostgreSQL:
# DATABASE_URL = postgresql://user:password@host:5432/dbname
```

### 1.4 Deploy
Click **"Create Web Service"**

Wait for deployment. You'll get a URL like:
`https://employee-reimbursement-api.onrender.com`

**Copy this URL** - you'll need it for the frontend!

---

## Step 2: Deploy Frontend to Netlify

### 2.1 Create Account
1. Go to [netlify.com](https://netlify.com)
2. Sign up with your GitHub account

### 2.2 Add New Site
1. Click **"Add new site"** → **"Import an existing project"**
2. Select your GitHub repository
3. Configure build:

```
Base directory: frontend
Build command: npm run build
Publish directory: .next
```

### 2.3 Set Environment Variables
In Site settings → Environment variables, add:

```
NEXT_PUBLIC_API_URL = https://employee-reimbursement-api.onrender.com
```

(Use the URL from Step 1)

### 2.4 Deploy
Click **"Deploy site"**

You'll get a URL like:
`https://employee-reimbursement.netlify.app`

---

## Step 3: Update CORS (Important!)

After deployment, update the backend CORS settings:

1. In `backend/main.py`, change line 53:

```python
# From:
allow_origins=["*"],

# To:
allow_origins=[
    "https://employee-reimbursement.netlify.app",
    "http://localhost:3000",
],
```

2. Commit and push changes:
```bash
git add .
git commit -m "Update CORS for production"
git push origin master
```

Render will auto-deploy the update.

---

## 📂 Project Structure

```
Employee-Reimbursement-Manager/
├── backend/                    # Deployed to Render
│   ├── main.py
│   ├── models.py
│   ├── requirements.txt
│   ├── render.yaml            # Render config
│   ├── Procfile               # Render command
│   ├── runtime.txt            # Python version
│   └── routes/
├── frontend/                   # Deployed to Netlify
│   ├── src/app/
│   ├── netlify.toml          # Netlify config
│   └── package.json
└── DEPLOY.md                 # This file
```

---

## 🔗 URLs After Deployment

| Service | URL | Purpose |
|---------|-----|---------|
| Frontend | `https://your-app.netlify.app` | User portal |
| Backend API | `https://your-api.onrender.com` | Admin panel + API |
| API Docs | `https://your-api.onrender.com/docs` | Swagger docs |

---

## 🔄 Auto Deployment

Both platforms auto-deploy on git push:

1. Make changes locally
2. `git push origin master`
3. Both Netlify and Render will automatically redeploy!

---

## 🐛 Troubleshooting

### Frontend can't connect to backend?
- Check `NEXT_PUBLIC_API_URL` is set correctly
- Ensure CORS allows your Netlify domain

### Backend shows "Application Error"?
- Check Render logs in dashboard
- Verify `DATABASE_URL` is set

### Changes not showing?
- Clear browser cache
- Check deployment logs in Netlify/Render

---

## 🎉 You're Live!

Your application is now deployed and accessible worldwide! 🌍

- Share the Netlify URL with users
- Access admin panel at your Render URL
- All data persists in the cloud
