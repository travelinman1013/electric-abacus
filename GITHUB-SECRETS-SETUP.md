# GitHub Secrets Setup Guide

This file contains the exact values you need to paste into GitHub Secrets for your staging environment.

---

## 📍 Where to Add Secrets

1. Go to your GitHub repository
2. Click **Settings** (top right)
3. In left sidebar: **Secrets and variables** → **Actions**
4. Click **"New repository secret"**
5. Add each secret below

---

## 🔐 Secrets to Add

### Admin SDK Secrets (for seed scripts)

#### `STAGING_FIREBASE_PROJECT_ID`
```
electric-abacus-staging
```

#### `STAGING_FIREBASE_CLIENT_EMAIL`
```
firebase-adminsdk-fbsvc@electric-abacus-staging.iam.gserviceaccount.com
```

#### `STAGING_FIREBASE_PRIVATE_KEY`
```
-----BEGIN PRIVATE KEY-----
MIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQDQT8mEEKnBPnBW
8sEnwxWkCVRWWr2ImKqWX7TgmlvqaKn7zXTXOD4ZQBVJZShlfU2g72N9jdewwDQv
HEK4qexdpXmKL/Ed97eujQiRg1GhVsT56QndK55085lxWQ1aUU001ACnVKBJDTEi
xIjeWxkC0dWKZoG1k/LFzvYtn01Nd1oVFFMPF36L+20dNAjlA8+NHdKmEesr+LIH
sud+KeKjn3x7RKH7YyHSB3pWCQJc6HA9DuDns/nYxc1IC9aghbCkil0Q/h9Ado8p
Z0aSrFx0l5JRvtTjr2eI/onaqCdadKebDfTbuJu9yOsY4+SYgSjT7VfiyVc2wbgF
7Wx2XhZzAgMBAAECggEANTQzqV3iJX+PjL2KtN+gLtnNJxMc9n7bjvWZyoXSNRAP
Xkcu8Osl/Sf/Z9QE2csDoTeTJxWrwbKNgXzL08NeodpqLO+quzcyPEw8JIIwPq9d
NuEcylbiLUesaKVQgkFioTwGgLZeC9ppMtKUjIoi3LQAQM2GknxblMcT3DokMcT0
g8Hla2nu9E6WmgKbCGvUmd/qIoEqQvc3Zpvsn2HYV+knRoZCLn43Mxl4sYPfa5Rw
3r+mFeTguNN76UUNjG5aSLtAeJKV6z4ujVEt5Zmi8lRBQUHdS5LaB8AqPXyrX4fN
Qw6ON/ZNxBUgtMi51fGQPR41lHpfXg5XGm7MVeYCkQKBgQDtpw+sJXG9QSDDxhK2
R63CW87OzDlCIeKRwkYAyI8LxDVBhN4JL8VPg7B4m3RI4nBVyBuuX6y+WFlRSuHf
PPBGC9XiDIR83NpUKxxKIu8GTLUexU8w5u1jld1DvYAk/QGHN+riLFTTPBDK1JUz
Tn9qQ2JJazMMQntiN9yw/yk2gwKBgQDgZNXfUfaIYxg4uIrriDWevkYi/a70+PcM
7zsJ+Q1fj0YmE2Ht053rAEqjEu8RUhhLWV/dSA+yKF1sdiftaOw80+KJGyPdgNvR
mBwPgQGQD0niSvfLm4vjWUySUm1NHJ+BZlgKMlZd6KCJxEoQcj9BIJ80FH9YrJC1
NoCkg40dUQKBgQCKkNHuiZabxpGYFLFsXrbNkEIxCZqJGMDGRAQVCNt+/NQgc5wS
tyvQhPQsHlfa90yQd7DMJzTNdy383DB+vUVLUjNPLgVB2HPkh45jG6NKhQdF/b2C
weLAIe11RdSlvG9brBrj7P04fNk9ql2kIKziBJAWRs7o4wqV5gRjnyMkiQKBgBw/
VVUJgllk8BWj1YkU2nsjRLz+5llcRe1Q6EO3IGHZLWF5qyg/LW/512tz5LhvdzN1
CsZWXfN1dV1D+n6+aI63tZrA2eD2abWWymGBQesaoZhlC5CMAi4afbMlwTCl28Z0
Vbzi3VBxClSNay1q1F+kdaYetnE5N/Y36DXNgaQhAoGBAIMhwfZaM9B0YE/RrTsu
5v2bFiOdgZq1WssM/FmhlMRmFJIHZNm/V8GT/YOvUV3dedN/asaRnYlSbVzqY/vx
hTC4cn6WcxvRGLCwEoqttAoeqLg5zJcuEeW0HFUpkn5JUlUM5gR7TpkgfmfDK12N
ZrjpkutUp94yy5iaOsqeAA6R
-----END PRIVATE KEY-----
```

---

### Client SDK Secrets (for React app)

#### `STAGING_VITE_FIREBASE_API_KEY`
```
AIzaSyBc6cyoYDS6P0o08guObTAJqj087Edg4z4
```

#### `STAGING_VITE_FIREBASE_AUTH_DOMAIN`
```
electric-abacus-staging.firebaseapp.com
```

#### `STAGING_VITE_FIREBASE_PROJECT_ID`
```
electric-abacus-staging
```

#### `STAGING_VITE_FIREBASE_STORAGE_BUCKET`
```
electric-abacus-staging.firebasestorage.app
```

#### `STAGING_VITE_FIREBASE_MESSAGING_SENDER_ID`
```
294090877005
```

#### `STAGING_VITE_FIREBASE_APP_ID`
```
1:294090877005:web:036875b801244fec055404
```

#### `STAGING_VITE_FIREBASE_MEASUREMENT_ID`
```
G-M748K6CKTY
```

---

### Service Account JSON (for Firebase deployment)

#### `STAGING_FIREBASE_SERVICE_ACCOUNT`

Paste the **entire contents** of the file:
`Electric Abacus STAGING Admin SDK.json`

(The file should start with `{` and end with `}`)

---

### Firebase CI Token

Run this command in your terminal:
```bash
firebase login:ci
```

Copy the token that appears, then add it as:

#### `FIREBASE_TOKEN`
```
[Paste the token from the command above]
```

---

## ✅ Verification

After adding all secrets, you should have **12 secrets total**:

1. `STAGING_FIREBASE_PROJECT_ID`
2. `STAGING_FIREBASE_CLIENT_EMAIL`
3. `STAGING_FIREBASE_PRIVATE_KEY`
4. `STAGING_VITE_FIREBASE_API_KEY`
5. `STAGING_VITE_FIREBASE_AUTH_DOMAIN`
6. `STAGING_VITE_FIREBASE_PROJECT_ID`
7. `STAGING_VITE_FIREBASE_STORAGE_BUCKET`
8. `STAGING_VITE_FIREBASE_MESSAGING_SENDER_ID`
9. `STAGING_VITE_FIREBASE_APP_ID`
10. `STAGING_VITE_FIREBASE_MEASUREMENT_ID`
11. `STAGING_FIREBASE_SERVICE_ACCOUNT`
12. `FIREBASE_TOKEN`

---

## 🔒 Security Note

**IMPORTANT:**
- These secrets are for STAGING only
- Never commit them to git
- Never share them publicly
- GitHub Secrets are encrypted and only visible to you

---

## 🚀 Next Steps

After adding all secrets:

1. Create and push `staging` branch
2. Push code to `staging` branch
3. Watch GitHub Actions deploy automatically
4. Access your staging site at: https://electric-abacus-staging.web.app

---

**Questions?** See `STAGING-QUICKSTART.md` or `DEPLOYMENT.md`
