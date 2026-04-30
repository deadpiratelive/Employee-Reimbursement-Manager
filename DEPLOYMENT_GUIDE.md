# 🚀 DEPLOYMENT GUIDE - Fly.io + Netlify

## 📋 Overview
Deploy Employee Reimbursement Manager to FREE hosting:
- **Backend**: Fly.io → https://reimbursesys.fly.dev
- **Frontend**: Netlify → https://reimbursesys.netlify.app

## ✅ Configuration Complete
All deployment files have been created and pushed to GitHub:
- ✅ `backend/fly.toml` - Fly.io configuration
- ✅ `backend/main.py` - CORS updated for production
- ✅ `frontend/netlify.toml` - Netlify configuration
- ✅ GitHub repo updated and pushed

---

## 🎯 DEPLOYMENT STEPS

### STEP 1: Deploy Backend to Fly.io (5 minutes)

#### 1.1 Install Fly.io CLI
Open PowerShell as Administrator and run:
```powershell
iwr -useb https://fly.io/install.ps1 | iex
```

#### 1.2 Login to Fly.io
```powershell
flyctl auth login
```
This will open a browser window to authenticate.

#### 1.3 Navigate to Backend
```powershell
cd D:\6sem\proj\Employee-Reimbursement-Manager\backend
```

#### 1.4 Launch on Fly.io
```powershell
flyctl launch
```
When prompted:
- **App name**: Enter `reimbursesys` (this creates your URL)
- **Region**: Select a region (default: iad - US East)
- **Select organization**: Choose your personal org

#### 1.5 Set Environment Variables
```powershell
flyctl secrets set DATABASE_URL "sqlite:///./reimbursement.db"
flyctl secrets set CORS_ORIGINS "https://reimbursesys.netlify.app,http://localhost:3000"
```

#### 1.6 Deploy
```powershell
flyctl deploy
```

#### 1.7 Verify Backend
Open in browser: **https://reimbursesys.fly.dev**
You should see the Admin Panel!

---

### STEP 2: Deploy Frontend to Netlify (5 minutes)

#### 2.1 Go to Netlify
Visit: **[app.netlify.com](https://app.netlify.com)**

#### 2.2 Import GitHub Repository
1. Click **"Add new site"**
2. Click **"Import an existing project"**
3. Select your GitHub repo: `deadpiratelive/Employee-Reimbursement-Manager`

#### 2.3 Configure Build
- **Base directory**: `frontend`
- **Build command**: `npm run build`
- **Publish directory**: `.next`

#### 2.4 Add Environment Variable
1. Click **"Show advanced"**
2. Click **"New variable"**
3. Add:
   - **Key**: `NEXT_PUBLIC_API_URL`
   - **Value**: `https://reimbursesys.fly.dev`
4. Click **"Save"**

#### 2.5 Deploy
Click **"Deploy site"** and wait for build to complete.

#### 2.6 Change Site Name
1. Go to **Site settings**
2. Click **"Change site name"**
3. Enter: `reimbursesys`
4. Click **"Save"**

#### 2.7 Verify Frontend
Open in browser: **https://reimbursesys.netlify.app**
You should see the User Portal!

---

## 🎉 YOUR SITE IS LIVE!

### Your URLs:
| Service | URL |
|---------|-----|
| 🌐 Frontend (User Portal) | **https://reimbursesys.netlify.app** |
| 🔧 Backend (Admin Panel) | **https://reimbulesys.fly.dev** |
| 📚 API Documentation | **https://reimbursesys.fly.dev/docs** |

---

## 🧪 Test Your Deployment

### Test Frontend (reimbursesys.netlify.app)
1. Submit an expense
2. Upload a bill (if amount ≥ ₹6000)
3. View dashboard
4. Check expense history

### Test Backend (reimbursesys.fly.dev)
1. Create a new user
2. Add an employee
3. Approve/reject pending expenses
4. View uploaded bills

### Test API Docs
Visit: **https://reimbursesys.fly.dev/docs**
- Test all API endpoints
- Verify authentication works

---

## 🔄 Auto-Deployment

Both platforms auto-deploy when you push to GitHub:

```bash
# Make changes locally
git add .
git commit -m "Your message"
git push origin master
```

Fly.io and Netlify will automatically redeploy!

---

## 🐛 Troubleshooting

### Fly.io Issues

**"flyctl: command not found"**
- Close and reopen PowerShell as Administrator
- Run the install command again

**"App name already exists"**
- Delete existing app: `flyctl apps destroy reimbursesys`
- Then run `flyctl launch` again

**"Database connection error"**
- Check DATABASE_URL secret is set correctly
- Verify SQLite file is created

### Netlify Issues

**"Build failed"**
- Check build logs in Netlify dashboard
- Ensure `npm install` runs successfully

**"API connection error"**
- Verify NEXT_PUBLIC_API_URL is set to `https://reimbursesys.fly.dev`
- Check CORS settings in backend

**"Site name already taken"**
- Try a different name like `reimbursesys-app`

---

## 💡 Tips

### Free Tier Limits
- **Fly.io**: 3 apps, 3GB volume, 160 CPU-sec/month
- **Netlify**: Unlimited sites, 100GB bandwidth/month

### Database
- SQLite is used (simpler than PostgreSQL)
- Data persists in Fly.io volume
- Bill images stored in mounted volume

### Performance
- Backend auto-stops when not in use (saves CPU)
- Frontend is always available
- Both scale automatically

---

## 📊 Monitoring

### Fly.io Dashboard
- Visit: [dashboard.fly.io](https://dashboard.fly.io)
- Monitor app health
- View logs
- Scale resources

### Netlify Dashboard
- Visit: [app.netlify.com](https://app.netlify.com)
- Monitor build status
- View site analytics
- Manage deployments

---

## 🎯 Next Steps

1. **Deploy now** using the steps above
2. **Test all features** on live site
3. **Share URLs** with users
4. **Monitor usage** in dashboards
5. **Update as needed** - just push to GitHub!

---

## 📞 Support

If you encounter issues:
1. Check deployment logs
2. Review this guide
3. Check GitHub repo for latest code
4. Verify environment variables

---

## 🎊 Congratulations!

Your Employee Reimbursement Manager is now live on the internet! 🌍

Users can access it from anywhere in the world!
