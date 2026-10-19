import os
from dotenv import load_dotenv

load_dotenv()

class Settings:
    PROJECT_NAME: str = "SkinLesion-ResNet18 Medical AI Platform"
    VERSION: str = "3.1.0"
    API_V1_STR: str = "/api/v1"
    
    # Environment & Host
    ENV: str = os.getenv("ENV", "development")
    HOST: str = os.getenv("HOST", "0.0.0.0")
    PORT: int = int(os.getenv("PORT", 8000))
    # CORS Configuration
    _cors_env: str = os.getenv("CORS_ORIGINS", "")
    CORS_ORIGINS: list[str] = [
        orig.strip() for orig in _cors_env.split(",") if orig.strip()
    ] if _cors_env else [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:8000",
        "http://127.0.0.1:8000",
    ]
    
    # Database
    # Default is SQLite file in backend/database.sqlite; supports postgresql://user:pass@host/db
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./database.sqlite")
    
    # Security & JWT
    SECRET_KEY: str = os.getenv("SECRET_KEY", "dermaclass_net_production_clinical_ai_secret_key_9482")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", 60 * 24)) # 24 hours
    
    # OTP & Security Settings
    OTP_EXPIRY_MINUTES: int = int(os.getenv("OTP_EXPIRY_MINUTES", "5"))
    OTP_MAX_ATTEMPTS: int = 5
    OTP_RESEND_COOLDOWN: int = int(os.getenv("OTP_RESEND_COOLDOWN", "60"))
    DEV_OTP_MODE: bool = False
    
    # Email / SMTP Configuration (Defaults to Gmail SMTP on Port 587 with STARTTLS)
    SMTP_HOST: str = (os.getenv("SMTP_HOST") or os.getenv("EMAIL_HOST") or "smtp.gmail.com").strip()
    SMTP_PORT: int = int(os.getenv("SMTP_PORT") or os.getenv("EMAIL_PORT") or 587)
    SMTP_USERNAME: str = (
        os.getenv("SMTP_USERNAME") 
        or os.getenv("EMAIL_USER") 
        or os.getenv("EMAIL_USERNAME") 
        or os.getenv("GMAIL_USER") 
        or os.getenv("GMAIL_ADDRESS") 
        or "reddyrajesh91960@gmail.com"
    ).strip()
    # Read Google App Password and strip spaces if user copied in 4-character chunks (e.g. 'abcd efgh ijkl mnop')
    _raw_smtp_pw: str = (
        os.getenv("SMTP_PASSWORD") 
        or os.getenv("EMAIL_PASSWORD") 
        or os.getenv("GMAIL_APP_PASSWORD") 
        or "ltgrssdiklmioeas"
    ).strip()
    SMTP_PASSWORD: str = _raw_smtp_pw.replace(" ", "") if " " in _raw_smtp_pw else _raw_smtp_pw
    SMTP_FROM_EMAIL: str = (
        os.getenv("SMTP_FROM_EMAIL") 
        or os.getenv("EMAIL_FROM") 
        or SMTP_USERNAME 
        or "reddyrajesh91960@gmail.com"
    ).strip()
    SMTP_FROM_NAME: str = (os.getenv("SMTP_FROM_NAME") or os.getenv("EMAIL_FROM_NAME") or "SkinIQ").strip()
    # Resend HTTPS API Key (Port 443)
    RESEND_API_KEY: str = os.getenv("RESEND_API_KEY", "").strip()
    
    # Storage & Uploads
    UPLOAD_DIR: str = os.getenv("UPLOAD_DIR", "uploads")
    REPORT_DIR: str = os.getenv("REPORT_DIR", "generated_reports")
    MAX_UPLOAD_SIZE_BYTES: int = 15 * 1024 * 1024 # 15 MB
    ALLOWED_IMAGE_EXTENSIONS: set[str] = {".jpg", ".jpeg", ".png", ".webp", ".bmp"}
    
    # ML Models & Assets
    # 1. SkinLesion-ResNet18: 2-class (BCC, MEL) image-only model
    ONNX_MODEL_PATH: str = os.getenv("ONNX_MODEL_PATH", "skinlesion_resnet18.onnx")
    # 2. DERMAClass-Net Final: 8-class multimodal evidential deep learning model
    _default_dermaclass_source: str = r"C:\Users\reddy\OneDrive\Desktop\Model ai model train folder For using website\dermaclass_net_final.onnx"
    _local_dermaclass_path: str = "dermaclass_net_final.onnx"
    DERMACLASS_ONNX_PATH: str = os.getenv(
        "DERMACLASS_ONNX_PATH",
        _local_dermaclass_path if os.path.exists(_local_dermaclass_path) else _default_dermaclass_source
    )
    EVAL_METRICS_PATH: str = os.getenv("EVAL_METRICS_PATH", "evaluation_metrics.json")
    FEDERATED_METRICS_PATH: str = os.getenv("FEDERATED_METRICS_PATH", "federated_metrics.json")

settings = Settings()

# Ensure directories exist
os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
os.makedirs(settings.REPORT_DIR, exist_ok=True)
