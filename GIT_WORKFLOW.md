# Git Workflow Guide

## Quick Push (Double-click this file)
Run `push-to-github.bat` - it will guide you through pushing changes.

## Manual Commands

### Check status of your changes
```bash
cd D:\6sem\proj\Employee-Reimbursement-Manager
git status
```

### Add changes to staging
```bash
# Add all changed files
git add .

# OR add specific file
git add filename.py
```

### Commit your changes (save locally)
```bash
git commit -m "Your message describing what changed"
```

### Push to GitHub (upload to remote)
```bash
git push origin master
```

## Common Workflows

### Daily workflow after making changes:
```bash
git add .
git commit -m "Fixed bug in expense form"
git push origin master
```

### Pull latest changes from GitHub (before working):
```bash
git pull origin master
```

### View commit history:
```bash
git log --oneline
```

## Important Notes

- ✅ Git tracks changes LOCALLY on your computer
- ✅ GitHub is the REMOTE backup/cloud storage
- ⚠️ `git commit` only saves locally
- ⚠️ `git push` uploads to GitHub
- ⚠️ Changes are NOT automatic - you must commit and push

## When to Push?

Push to GitHub when:
- ✅ You finish a feature
- ✅ You fix a bug
- ✅ You want to backup your work
- ✅ Before stopping for the day
- ✅ Before making big changes (as backup)

## GitHub URL

Your repository: https://github.com/deadpiratelive/Employee-Reimbursement-Manager
