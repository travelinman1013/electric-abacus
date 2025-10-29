# Electric Abacus - Deployment Guide

Complete guide for deploying Electric Abacus to **Staging** and **Production** environments.

---

## 📋 Table of Contents

- [Environment Architecture](#environment-architecture)
- [Initial Setup](#initial-setup)
- [GitHub Secrets Configuration](#github-secrets-configuration)
- [Manual Deployment](#manual-deployment)
- [Automated Deployment (CI/CD)](#automated-deployment-cicd)
- [Data Seeding](#data-seeding)
- [Troubleshooting](#troubleshooting)
- [Environment Management](#environment-management)

---

## 🏗️ Environment Architecture

Electric Abacus uses **two completely separate Firebase projects** for isolation:

| Environment | Firebase Project | URL | Auto-Deploy |
|------------|------------------|-----|-------------|
| **Production** | `electric-abacus` | https://electric-abacus.web.app | Manual only |
| **Staging** | `electric-abacus-staging` | https://electric-abacus-staging.web.app | Auto on `staging` branch |

**Key Isolation Features:**
- ✅ Separate Firebase Auth users
- ✅ Separate Firestore databases
- ✅ Separate Cloud Functions deployments
- ✅ Independent billing and quotas
- ✅ Complete security isolation

---

## 🚀 Initial Setup

### Prerequisites

1. **Node.js 20+** installed
2. **Firebase CLI** installed globally:
   ```bash
   npm install -g firebase-tools
   ```
3. **Firebase projects created** (staging and production)
4. **GitHub repository** set up

### 1. Verify Firebase Projects

```bash
firebase projects:list
```

You should see both:
- `electric-abacus` (production)
- `electric-abacus-staging` (staging)

### 2. Switch Between Projects

```bash
# Use staging
firebase use staging

# Use production
firebase use production

# Check current project
firebase use
```

### 3. Verify Local Configuration

Check that `.firebaserc` contains both projects:

```json
{
  "projects": {
    "default": "electric-abacus",
    "production": "electric-abacus",
    "staging": "electric-abacus-staging"
  }
}
```

---

## 🔐 GitHub Secrets Configuration

### Required Secrets

You need to configure GitHub Secrets for CI/CD to work. Go to your GitHub repository:

**Settings → Secrets and variables → Actions → New repository secret**

### Staging Secrets

Add these secrets with prefix `STAGING_`:

#### Admin SDK (for server-side scripts)
| Secret Name | Value | How to Get |
|------------|-------|------------|
| `STAGING_FIREBASE_PROJECT_ID` | `electric-abacus-staging` | From Firebase Console → Project Settings |
| `STAGING_FIREBASE_CLIENT_EMAIL` | `firebase-adminsdk-xxxxx@electric-abacus-staging.iam.gserviceaccount.com` | From service account JSON |
| `STAGING_FIREBASE_PRIVATE_KEY` | `-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n` | From service account JSON (keep \n) |

#### Client SDK (for React app)
| Secret Name | Value | How to Get |
|------------|-------|------------|
| `STAGING_VITE_FIREBASE_API_KEY` | `AIzaSy...` | Firebase Console → Project Settings → Your apps |
| `STAGING_VITE_FIREBASE_AUTH_DOMAIN` | `electric-abacus-staging.firebaseapp.com` | Firebase Console → Project Settings |
| `STAGING_VITE_FIREBASE_PROJECT_ID` | `electric-abacus-staging` | Firebase Console → Project Settings |
| `STAGING_VITE_FIREBASE_STORAGE_BUCKET` | `electric-abacus-staging.firebasestorage.app` | Firebase Console → Project Settings |
| `STAGING_VITE_FIREBASE_MESSAGING_SENDER_ID` | `123456789` | Firebase Console → Project Settings |
| `STAGING_VITE_FIREBASE_APP_ID` | `1:123456789:web:abcdef` | Firebase Console → Project Settings |
| `STAGING_VITE_FIREBASE_MEASUREMENT_ID` | `G-XXXXXXXXXX` | Firebase Console → Project Settings |

#### Firebase Service Account (for deployment)
| Secret Name | Value | How to Get |
|------------|-------|------------|
| `STAGING_FIREBASE_SERVICE_ACCOUNT` | Full JSON content | Firebase Console → Project Settings → Service Accounts → Generate new private key |

### Production Secrets

Repeat the same process with prefix `PRODUCTION_` for production environment.

### Firebase Token

Generate a Firebase CI token (shared between staging and production):

```bash
firebase login:ci
```

Copy the token and add it as:
- **Secret Name:** `FIREBASE_TOKEN`
- **Value:** The token from the command above

---

## 🛠️ Manual Deployment

### Deploy Staging

```bash
# 1. Switch to staging branch
git checkout staging

# 2. Deploy everything
npm run deploy:staging

# Or deploy specific services:
firebase deploy --only hosting --project staging
firebase deploy --only firestore:rules --project staging
firebase deploy --only functions --project staging
```

### Deploy Production

```bash
# 1. Switch to main/production branch
git checkout main

# 2. Run tests first
npm run test:unit
npm run test:e2e

# 3. Deploy everything
npm run deploy:production

# Or deploy specific services:
firebase deploy --only hosting --project production
firebase deploy --only firestore:rules --project production
firebase deploy --only functions --project production
```

---

## 🤖 Automated Deployment (CI/CD)

### Staging: Auto-Deploy on Push

**Workflow:** `.github/workflows/deploy-staging.yml`

**Trigger:** Push to `staging` branch

```bash
# Example: Deploy to staging automatically
git checkout staging
git merge main
git push origin staging
# GitHub Actions will automatically deploy
```

**What it does:**
1. ✅ Runs linter
2. ✅ Runs unit tests
3. ✅ Builds staging app
4. ✅ Deploys to Firebase Staging
5. ✅ Deploys Firestore rules
6. ✅ Deploys Cloud Functions

**Monitor deployment:** Go to GitHub → Actions tab

### Production: Manual Trigger Only

**Workflow:** `.github/workflows/deploy-production.yml`

**Trigger:** Manual only (for safety)

**Steps to deploy:**

1. Go to GitHub → Actions → "Deploy to Production"
2. Click "Run workflow"
3. Type **`deploy`** in the confirmation field (safety check)
4. Click "Run workflow"

**What it does:**
1. ✅ Runs linter
2. ✅ Runs unit tests
3. ✅ **Runs e2e tests** (production only)
4. ✅ Builds production app
5. ✅ Deploys to Firebase Production
6. ✅ Deploys Firestore rules
7. ✅ Deploys Cloud Functions

**Monitor deployment:** Go to GitHub → Actions tab

---

## 🌱 Data Seeding

### Seed Staging Environment

```bash
# Seed staging with demo data
npm run seed:staging

# Or with full path
npm --workspace packages/firebase run seed:staging
```

**What it creates:**
- 3 demo restaurants (Little Tokyo, Taco Casa, Ruby Slipper)
- Owner and staff users for each
- 30-40 ingredients per restaurant
- 10-15 menu items with recipes
- 6 weeks of historical data (finalized)
- 1 draft week for current operations

**Demo credentials (staging only):**
```
Little Tokyo Owner: owner@littletokyo.test / OwnerPass123!
Taco Casa Owner: owner@tacocasa.test / OwnerPass123!
Ruby Slipper Owner: owner@rubyslipper.test / OwnerPass123!
```

### Seed Production Environment

⚠️ **Warning:** Only seed production if you need demo data for testing.

```bash
npm run seed:production
```

---

## 🔍 Troubleshooting

### Build Failures

**Problem:** `vite build` fails

**Solution:**
```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install

# Clear Vite cache
rm -rf apps/web/node_modules/.vite
```

### Deployment Fails: "Permission Denied"

**Problem:** Firebase deployment fails with permission error

**Solution:**
1. Check Firebase CLI login:
   ```bash
   firebase logout
   firebase login
   ```
2. Verify project access:
   ```bash
   firebase projects:list
   ```
3. Check GitHub Secrets are correctly configured

### Environment Variables Not Loading

**Problem:** Firebase config is undefined in the app

**Solution:**
1. Verify `.env.staging` or `.env.production` exists in `apps/web/`
2. Ensure all variables start with `VITE_`
3. Restart dev server after adding env vars
4. Check file is not gitignored incorrectly

### Functions Deployment Fails

**Problem:** Cloud Functions fail to deploy

**Solution:**
```bash
# Navigate to functions directory
cd packages/firebase/functions

# Install dependencies
npm install

# Build TypeScript
npm run build

# Try deploying again
firebase deploy --only functions --project staging
```

### GitHub Actions Workflow Fails

**Problem:** Workflow fails on GitHub Actions

**Solution:**
1. Check GitHub Secrets are set correctly
2. View workflow logs for specific error
3. Verify service account JSON is valid
4. Check Firebase token hasn't expired

### Firestore Rules Deployment Fails

**Problem:** Rules fail to deploy

**Solution:**
```bash
# Test rules locally first
firebase emulators:start --only firestore

# Deploy rules separately
firebase deploy --only firestore:rules --project staging
```

---

## 🔄 Environment Management

### Check Current Environment

```bash
# Check Firebase project
firebase use

# Check git branch
git branch

# Check environment variables (in apps/web)
cat .env.staging
cat .env.production
```

### Create New Environment Branch

```bash
# Create staging branch from main
git checkout main
git pull origin main
git checkout -b staging
git push -u origin staging
```

### Switch Environments Locally

```bash
# For local development with staging
cd apps/web
cp .env.staging .env
npm run dev

# For local development with production data (be careful!)
cd apps/web
cp .env.production .env
npm run dev
```

### Update Environment Variables

**Local:**
1. Edit `.env.staging` or `.env.production`
2. Restart dev server

**GitHub Actions:**
1. Go to GitHub → Settings → Secrets and variables → Actions
2. Update the relevant secret
3. Re-run the workflow

**Production/Staging (deployed):**
1. Update `.env.staging` or `.env.production` locally
2. Commit and push
3. Re-deploy via GitHub Actions or manual deployment

---

## 📊 Monitoring

### Firebase Console

- **Staging:** https://console.firebase.google.com/project/electric-abacus-staging
- **Production:** https://console.firebase.google.com/project/electric-abacus

**Monitor:**
- Authentication users
- Firestore data
- Cloud Functions logs
- Hosting analytics
- Performance monitoring

### GitHub Actions

**View deployment history:**
1. Go to GitHub repository
2. Click "Actions" tab
3. See all workflow runs

### Logs

**Cloud Functions logs:**
```bash
# Staging
firebase functions:log --project staging

# Production
firebase functions:log --project production
```

**Hosting logs:**
Check Firebase Console → Hosting → Usage tab

---

## 🆘 Support

### Common Commands Reference

```bash
# Firebase
firebase login
firebase logout
firebase projects:list
firebase use staging
firebase use production
firebase deploy --help

# NPM Scripts
npm run dev              # Start development server
npm run build:staging    # Build for staging
npm run build:production # Build for production
npm run deploy:staging   # Deploy to staging
npm run deploy:production # Deploy to production
npm run seed:staging     # Seed staging data
npm run seed:production  # Seed production data
npm run test:unit        # Run unit tests
npm run test:e2e         # Run e2e tests
npm run lint             # Run linter

# Git
git checkout staging     # Switch to staging branch
git checkout main        # Switch to main branch
git merge main           # Merge main into current branch
git push origin staging  # Push staging branch (triggers auto-deploy)
```

### Getting Help

1. **Check logs** - GitHub Actions, Firebase Console, browser console
2. **Review this guide** - Most issues are covered above
3. **Search existing issues** - GitHub repository issues
4. **Contact team** - Slack, email, or create a GitHub issue

---

## 📝 Changelog

### 2025-10-29 - Initial Staging Setup
- Created separate staging Firebase project
- Configured environment-specific builds
- Set up GitHub Actions CI/CD
- Added comprehensive deployment documentation

---

**Last Updated:** 2025-10-29
**Version:** 1.0.0
