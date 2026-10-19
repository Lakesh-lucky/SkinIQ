# SkinIQ Medical AI Platform — Production Cloud Deployment Guide

This guide walks you through deploying **SkinIQ** completely online:
- **Backend & AI Inference**: [Render](https://render.com) (Python 3 FastAPI Web Service)
- **Database**: [Render PostgreSQL](https://render.com) (Managed Database)
- **Frontend**: [Vercel](https://vercel.com) (Vite + React SPA on Edge CDN)

---

## Architecture Overview

```
 ┌─────────────────────────────────────────────────────────┐
 │               Vercel Edge Global CDN                   │
 │   Frontend (Vite / React SPA) -> https://skiniq.vercel.app │
 └────────────────────────────┬────────────────────────────┘
                              │ HTTPS REST API Requests
                              ▼
 ┌─────────────────────────────────────────────────────────┐
 │                  Render Web Service                     │
 │  Backend (FastAPI / Uvicorn) -> https://<backend>.onrender.com │
 │  ML Inference (SkinLesion-ResNet18 & DERMAClass-Net)   │
 └────────────────────────────┬────────────────────────────┘
                              │ PostgreSQL Protocol
                              ▼
 ┌─────────────────────────────────────────────────────────┐
 │                 Render Managed Database                 │
 │            PostgreSQL (Tables Auto-Seeded)              │
 └─────────────────────────────────────────────────────────┘
```

---

## Part 1: Backend & Database Deployment on Render

### Method 1: Automated 1-Click Blueprint (Recommended)

Render provides Infrastructure as Code using the included [`render.yaml`](file:///c:/Users/reddy/OneDrive/Desktop/Multi-Model%20Skin%20Cancer%20Detection/render.yaml).

1. Log in to [Render Dashboard](https://dashboard.render.com/).
2. In the top right, click **New +** and select **Blueprint**.
3. Connect your GitHub account and choose repository: **`Lakesh-lucky/SkinIQ`**.
4. Render detects `render.yaml` and will display:
   - **`skiniq-db`**: Render Managed PostgreSQL Database (Free tier)
   - **`skiniq-backend`**: Python Web Service running FastAPI
5. Fill in the optional SMTP values (or leave them to enter later):
   - `SMTP_USERNAME`: Your Gmail address (e.g. `your-email@gmail.com`)
   - `SMTP_PASSWORD`: Your 16-character [Google App Password](https://myaccount.google.com/apppasswords)
   - `SMTP_FROM_EMAIL`: Your Gmail address
6. Click **Apply**.
7. Render will provision the PostgreSQL database and build the backend.
8. Once deployed, copy your Render Web Service URL (e.g. `https://skiniq-backend.onrender.com`).

---

### Method 2: Manual Setup on Render (Step-by-Step)

If you prefer to configure each service manually:

#### Step 1: Create PostgreSQL Database
1. Go to [Render Dashboard](https://dashboard.render.com/) -> **New +** -> **PostgreSQL**.
2. Set:
   - **Name**: `skiniq-db`
   - **Database**: `skiniq`
   - **User**: `skiniq_user`
   - **Plan**: `Free`
3. Click **Create Database**.
4. Once created, copy the **Internal Database URL** (e.g. `postgres://skiniq_user:...@dpg-...-a/skiniq`).

#### Step 2: Create Web Service
1. In Render Dashboard, click **New +** -> **Web Service**.
2. Select your GitHub repository: **`Lakesh-lucky/SkinIQ`**.
3. Configure the following settings:
   - **Name**: `skiniq-backend`
   - **Region**: Oregon (or nearest to your DB)
   - **Branch**: `main`
   - **Runtime**: `Python 3`
   - **Build Command**: `./build.sh`
   - **Start Command**: `uvicorn backend.app:app --host 0.0.0.0 --port $PORT`
   - **Plan**: `Free`
4. Expand **Advanced** -> **Add Environment Variable**:
   | Key | Value | Notes |
   |-----|-------|-------|
   | `DATABASE_URL` | `<Your Render PostgreSQL URL>` | Paste from Step 1 |
   | `SECRET_KEY` | *(Click "Generate" or enter random string)* | JWT Secret |
   | `ENV` | `production` | Production mode |
   | `HOST` | `0.0.0.0` | Listen host |
   | `CORS_ORIGINS` | `*` | Or your Vercel URL |
   | `SMTP_HOST` | `smtp.gmail.com` | Gmail SMTP |
   | `SMTP_PORT` | `587` | STARTTLS port |
   | `SMTP_USERNAME` | `your-email@gmail.com` | Gmail address |
   | `SMTP_PASSWORD` | `your-app-password` | 16-char App Password |
   | `SMTP_FROM_EMAIL` | `your-email@gmail.com` | Sender address |
   | `SMTP_FROM_NAME` | `SkinIQ` | Platform title |
5. Click **Create Web Service**.
6. When deployment finishes, copy your live backend URL (e.g., `https://skiniq-backend.onrender.com`).

---

## Part 2: Frontend Deployment on Vercel

1. Log in to [Vercel](https://vercel.com).
2. Click **Add New...** -> **Project**.
3. Import your GitHub repository: **`Lakesh-lucky/SkinIQ`**.
4. Vercel automatically detects the framework as **Vite**.
5. Keep default build settings:
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
   - **Install Command**: `npm install`
6. Expand **Environment Variables** and add:
   | Variable Name | Value |
   |---------------|-------|
   | `VITE_API_BASE_URL` | `https://<your-render-backend-name>.onrender.com` |
7. Click **Deploy**.
8. In ~40 seconds, your site is live worldwide at `https://<project-name>.vercel.app`!

---

## Pre-Seeded Medical Accounts

On first database startup, the database is automatically created and seeded:

| Role | Email | Password | Status |
|------|-------|----------|--------|
| **Lead Clinician** | `dr.evelyn.vance@dermaclass.med` | `Doctor@2026` | Verified Doctor |
| **System Admin** | `admin@dermaclass.med` | `Admin@2026` | Platform Administrator |

You can also register new clinician accounts with real-time Gmail OTP verification anytime.

---

## Post-Deployment Verification Checklist

- [ ] Open `https://<your-vercel-domain>.vercel.app` — verify landing page loads.
- [ ] Log in with `dr.evelyn.vance@dermaclass.med` / `Doctor@2026`.
- [ ] Go to **New Analysis Workspace** and upload a skin lesion test image.
- [ ] Verify both **SkinLesion-ResNet18** and **DERMAClass-Net** dual model inference work.
- [ ] Click **Download PDF Report** to test clinical report generation.
- [ ] Test real-time appointment booking and patient record management.
