import os
import sys

# Ensure UTF-8 on Windows
if sys.platform == 'win32':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
        sys.stderr.reconfigure(encoding='utf-8')
    except Exception:
        pass

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse
import uvicorn

from backend.config import settings
from backend.database import engine, SessionLocal
from backend.models import init_db, User, DoctorProfile, PatientProfile, UserRole, ModelVersion
from backend.services.auth_service import hash_password
from backend.routers import (
    auth_router,
    patients_router,
    scans_router,
    appointments_router,
    notifications_router,
    support_router,
    reports_router,
    admin_router,
    system_router
)

# ---------------------------------------------------------------------------
# 1. FastAPI Application Definition
# ---------------------------------------------------------------------------

app = FastAPI(
    title=settings.PROJECT_NAME,
    description="Clinical-Grade Multimodal Skin Cancer Diagnostic & Federated Medical AI Platform",
    version=settings.VERSION,
    docs_url="/docs",
    redoc_url="/redoc"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_origin_regex=r"^https?:\/\/.*",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# 2. Database Initialization & Seeding Defaults
# ---------------------------------------------------------------------------

def seed_initial_medical_accounts():
    """Initializes tables and creates default clinician and admin accounts if DB is fresh."""
    init_db()
    db = SessionLocal()
    try:
        # 1. Seed Active Model Version (SkinLesion-ResNet18)
        active_ver = db.query(ModelVersion).filter(ModelVersion.version == "v1.0.0-resnet18").first()
        if not active_ver:
            model_ver = ModelVersion(
                model_name="SkinLesion-ResNet18",
                version="v1.0.0-resnet18",
                input_size="224x224x3",
                training_dataset="ISIC Skin Lesion Dataset (BCC / MEL binary classification)",
                is_active=True
            )
            db.add(model_ver)

        # 2. Seed Default Lead Clinician
        lead_doc = db.query(User).filter(User.email == "dr.evelyn.vance@dermaclass.med").first()
        if not lead_doc:
            doc_user = User(
                email="dr.evelyn.vance@dermaclass.med",
                phone="+1 (555) 849-2001",
                full_name="Dr. Evelyn Vance, MD",
                role=UserRole.DOCTOR,
                hashed_password=hash_password("Doctor@2026"),
                is_verified=True,
                is_active=True
            )
            db.add(doc_user)
            db.flush()

            doc_profile = DoctorProfile(
                user_id=doc_user.id,
                doctor_code="DR001",
                license_number="MD-84920-DERM",
                specialization="Cutaneous Oncology & Dermoscopy",
                hospital_affiliation="Pacific Coast Dermatology Institute",
                department="Cutaneous Oncology",
                verification_status="VERIFIED"
            )
            db.add(doc_profile)

        # 3. Seed Platform Administrator
        admin_user = db.query(User).filter(User.email == "admin@dermaclass.med").first()
        if not admin_user:
            adm = User(
                email="admin@dermaclass.med",
                phone="+1 (555) 100-0001",
                full_name="Chief Medical Admin",
                role=UserRole.ADMIN,
                hashed_password=hash_password("Admin@2026"),
                is_verified=True,
                is_active=True
            )
            db.add(adm)

        db.commit()
        print("[Database] Schema initialized and base verified accounts verified.")
    except Exception as e:
        db.rollback()
        print(f"[Database] Warning during initialization: {e}")
    finally:
        db.close()

seed_initial_medical_accounts()

# ---------------------------------------------------------------------------
# 3. Router Inclusions
# ---------------------------------------------------------------------------

# V1 API Routers
app.include_router(auth_router, prefix=settings.API_V1_STR)
app.include_router(patients_router, prefix=settings.API_V1_STR)
app.include_router(appointments_router, prefix=settings.API_V1_STR)
app.include_router(notifications_router, prefix=settings.API_V1_STR)
app.include_router(support_router, prefix=settings.API_V1_STR)
app.include_router(reports_router, prefix=settings.API_V1_STR)
app.include_router(admin_router, prefix=settings.API_V1_STR)
app.include_router(scans_router)
app.include_router(system_router)

# ---------------------------------------------------------------------------
# 4. Static Mount & SPA Client Routing Fallback
# ---------------------------------------------------------------------------

ROOT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DIST_DIR = os.path.join(ROOT_DIR, "dist")
UPLOADS_DIR = os.path.join(ROOT_DIR, settings.UPLOAD_DIR)

if os.path.exists(UPLOADS_DIR):
    app.mount("/uploads", StaticFiles(directory=UPLOADS_DIR), name="uploads")

if os.path.exists(DIST_DIR):
    assets_dir = os.path.join(DIST_DIR, "assets")
    if os.path.exists(assets_dir):
        app.mount("/assets", StaticFiles(directory=assets_dir), name="assets")

    @app.get("/{full_path:path}")
    async def serve_spa_frontend(full_path: str):
        # Serve existing files (e.g. favicon.ico, manifest.json)
        file_path = os.path.join(DIST_DIR, full_path)
        if full_path and os.path.exists(file_path) and os.path.isfile(file_path):
            return FileResponse(file_path)
        # Otherwise fallback to index.html for React SPA routes
        index_file = os.path.join(DIST_DIR, "index.html")
        if os.path.exists(index_file):
            return FileResponse(index_file)
        return JSONResponse({"message": "DermaClass-Net backend running. Build frontend with 'npm run build' to serve UI."})

# ---------------------------------------------------------------------------
# 5. Main Entrypoint
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    print(f"Starting {settings.PROJECT_NAME} on http://{settings.HOST}:{settings.PORT} ...")
    uvicorn.run(app, host=settings.HOST, port=settings.PORT)
