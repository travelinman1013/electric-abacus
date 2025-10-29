# Staging Environment - Quick Start Guide

**TL;DR:** How to get your staging environment running in 5 minutes.

---

## ✅ What's Already Done

✅ Firebase project created: `electric-abacus-staging`
✅ Environment config files created (`.env.staging`, `.env.production`)
✅ Build scripts configured (`npm run build:staging`)
✅ Deploy scripts configured (`npm run deploy:staging`)
✅ GitHub Actions workflows set up (`.github/workflows/`)
✅ Seed script enhanced (` npm run seed:staging`)
✅ Documentation created (`DEPLOYMENT.md`)

---

## 🚀 Next Steps (What YOU Need to Do)

### Step 1: Configure GitHub Secrets (5 minutes)

Go to: **GitHub Repo → Settings → Secrets and variables → Actions**

Click **"New repository secret"** and add these:

#### Staging Secrets
```
STAGING_FIREBASE_PROJECT_ID = electric-abacus-staging
STAGING_FIREBASE_CLIENT_EMAIL = firebase-adminsdk-fbsvc@electric-abacus-staging.iam.gserviceaccount.com
STAGING_FIREBASE_PRIVATE_KEY = [Full private key from service account JSON]

STAGING_VITE_FIREBASE_API_KEY = AIzaSyBc6cyoYDS6P0o08guObTAJqj087Edg4z4
STAGING_VITE_FIREBASE_AUTH_DOMAIN = electric-abacus-staging.firebaseapp.com
STAGING_VITE_FIREBASE_PROJECT_ID = electric-abacus-staging
STAGING_VITE_FIREBASE_STORAGE_BUCKET = electric-abacus-staging.firebasestorage.app
STAGING_VITE_FIREBASE_MESSAGING_SENDER_ID = 294090877005
STAGING_VITE_FIREBASE_APP_ID = 1:294090877005:web:036875b801244fec055404
STAGING_VITE_FIREBASE_MEASUREMENT_ID = G-M748K6CKTY

STAGING_FIREBASE_SERVICE_ACCOUNT = [Full JSON from service account file]
```

#### Firebase Token
Run this command locally:
```bash
firebase login:ci
```

Copy the token and add it as:
```
FIREBASE_TOKEN = [token from command above]
```

### Step 2: Create Staging Branch

```bash
# Create and push staging branch
git checkout -b staging
git push -u origin staging
```

### Step 3: Test Manual Deployment

```bash
# Deploy to staging manually first
npm run deploy:staging
```

**Expected output:**
```
✔  Deploy complete!

Hosting URL: https://electric-abacus-staging.web.app
```

### Step 4: Seed Staging Data

```bash
# Populate staging with demo data
npm run seed:staging
```

**Expected output:**
```
🌱 Starting seed process for 3 restaurants in STAGING environment...
✅ Business created: little-tokyo
✅ User created: owner@littletokyo.test
...
🎉 Seeding complete!
```

### Step 5: Test Auto-Deployment

```bash
# Make a small change
echo "# Staging test" >> README.md

# Commit and push to staging branch
git add README.md
git commit -m "test: staging auto-deploy"
git push origin staging
```

**Then:** Go to GitHub → Actions tab → Watch deployment

---

## 🎯 Quick Commands

### Development
```bash
# Run dev server with staging config
cd apps/web
cp .env.staging .env
npm run dev
```

### Deployment
```bash
# Deploy staging manually
npm run deploy:staging

# Deploy production manually (careful!)
npm run deploy:production

# Seed staging data
npm run seed:staging
```

### Firebase
```bash
# Switch to staging project
firebase use staging

# Switch to production project
firebase use production

# Check current project
firebase use
```

### Git Workflow
```bash
# Work on feature in main
git checkout main
git pull
# ... make changes ...
git commit -m "feat: new feature"
git push origin main

# Merge to staging for testing
git checkout staging
git merge main
git push origin staging  # Auto-deploys to staging

# After testing, manually deploy to production via GitHub Actions
```

---

## 🔍 Verify Setup

### 1. Check Firebase Projects
```bash
firebase projects:list
```
Should show:
- `electric-abacus` (production)
- `electric-abacus-staging` (staging)

### 2. Check Environment Files
```bash
ls -la .env*
ls -la apps/web/.env*
```
Should show:
- `.env.production`
- `.env.staging`
- `.env.example`
- `apps/web/.env.production`
- `apps/web/.env.staging`
- `apps/web/.env.example`

### 3. Check GitHub Workflows
```bash
ls -la .github/workflows/
```
Should show:
- `deploy-staging.yml`
- `deploy-production.yml`

### 4. Check Build Scripts
```bash
npm run build:staging
```
Should build successfully for staging.

---

## 📱 Access URLs

After deployment:

- **Staging:** https://electric-abacus-staging.web.app
- **Production:** https://electric-abacus.web.app

**Firebase Consoles:**
- **Staging:** https://console.firebase.google.com/project/electric-abacus-staging
- **Production:** https://console.firebase.google.com/project/electric-abacus

---

## 🆘 Quick Troubleshooting

### "Permission denied" during deployment
```bash
firebase logout
firebase login
firebase use staging
```

### Environment variables not loading
```bash
# Verify files exist
cat apps/web/.env.staging

# Restart dev server
npm run dev
```

### GitHub Actions failing
1. Check all secrets are set in GitHub
2. Verify service account JSON is complete
3. Check Firebase token is valid (`firebase login:ci`)

### Build fails
```bash
# Clean install
rm -rf node_modules package-lock.json
npm install
```

---

## 📖 Full Documentation

For detailed information, see `DEPLOYMENT.md`

---

## ✨ Success Checklist

- [ ] GitHub Secrets configured
- [ ] Staging branch created and pushed
- [ ] Manual deployment successful
- [ ] Staging data seeded
- [ ] Auto-deployment tested
- [ ] Staging URL accessible
- [ ] Team members can access staging

**Once all checked, you're done! 🎉**

---

**Need Help?** Check `DEPLOYMENT.md` or contact the team.
