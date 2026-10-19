from datetime import datetime
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status, Header
from sqlalchemy.orm import Session

from backend.config import settings
from backend.database import get_db
from backend.models.user import User, DoctorProfile, UserRole
from backend.models.otp import OtpPurpose
from backend.schemas.auth import (
    UserLoginRequest,
    DoctorLoginVerifyRequest,
    DoctorResendOtpRequest,
    DoctorRegisterRequest,
    DoctorSignupVerifyRequest,
    DoctorResendSignupOtpRequest,
    ForgotPasswordRequest,
    VerifyResetOtpRequest,
    ResetPasswordRequest,
    ChangePasswordRequest
)
from backend.services.auth_service import (
    hash_password,
    verify_password,
    create_access_token,
    decode_access_token
)
from backend.services.email_service import (
    is_smtp_configured,
    send_doctor_otp_email,
    send_signup_otp_email,
    send_password_reset_otp_email
)
from backend.services.otp_service import (
    create_and_store_otp,
    verify_otp_code,
    check_resend_cooldown
)
from backend.services.audit_service import log_audit_event

router = APIRouter(prefix="/auth", tags=["Doctor Authentication"])

def mask_email(email: str) -> str:
    """Masks an email for privacy (e.g. d******@example.com)."""
    if not email or "@" not in email:
        return email
    local, domain = email.split("@", 1)
    if len(local) <= 1:
        masked_local = f"{local}******"
    else:
        masked_local = f"{local[0]}******"
    return f"{masked_local}@{domain}"

def get_current_user(
    authorization: Optional[str] = Header(None),
    db: Session = Depends(get_db)
) -> User:
    """FastAPI dependency to extract and validate the authenticated Doctor."""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing or invalid authentication token. Please sign in.",
            headers={"WWW-Authenticate": "Bearer"}
        )
    
    token = authorization.split(" ")[1]
    payload = decode_access_token(token)
    if not payload or "sub" not in payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session has expired or token is invalid. Please sign in again.",
            headers={"WWW-Authenticate": "Bearer"}
        )
    
    user_id = payload["sub"]
    user = db.query(User).filter(User.id == user_id, User.is_active == True).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Doctor account not found or deactivated.",
            headers={"WWW-Authenticate": "Bearer"}
        )
    return user

def format_user_response(user: User) -> dict:
    doc_profile = None
    if user.doctor_profile:
        doc_profile = {
            "doctor_code": user.doctor_profile.doctor_code,
            "license_number": user.doctor_profile.license_number,
            "specialization": user.doctor_profile.specialization,
            "hospital_affiliation": user.doctor_profile.hospital_affiliation,
            "department": user.doctor_profile.department,
            "verification_status": user.doctor_profile.verification_status
        }
    
    return {
        "id": user.id,
        "email": user.email,
        "phone": user.phone,
        "full_name": user.full_name,
        "role": user.role,
        "is_verified": user.is_verified,
        "is_active": user.is_active,
        "created_at": user.created_at.isoformat() if user.created_at else "",
        "doctor_profile": doc_profile
    }

@router.get("/smtp-status")
def get_smtp_status():
    """Returns whether Gmail SMTP is configured for sending verification emails."""
    configured = is_smtp_configured()
    return {
        "configured": configured,
        "host": settings.SMTP_HOST if configured else "",
        "from_email": settings.SMTP_FROM_EMAIL if configured else "",
        "from_name": settings.SMTP_FROM_NAME,
        "otp_expiry_minutes": settings.OTP_EXPIRY_MINUTES,
        "resend_cooldown": settings.OTP_RESEND_COOLDOWN
    }

@router.post("/login")
def doctor_login_step1(req: UserLoginRequest, db: Session = Depends(get_db)):
    """
    Step 1 of Doctor Authentication:
    Validates email + password -> Generates 6-digit OTP -> Sends OTP to doctor's registered email via Gmail SMTP.
    Never returns OTP in API response.
    """
    clean_email = req.email.strip().lower()
    user = db.query(User).filter(User.email == clean_email).first()

    if not user or not verify_password(req.password, user.hashed_password):
        log_audit_event(db, action="LOGIN_FAILED", user_email=clean_email, status="FAILED", details="Invalid credentials")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email address or password."
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This clinician account has been deactivated. Please contact support."
        )

    # Check if SMTP is configured before attempting email delivery
    if not is_smtp_configured():
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Email service is not configured. Please configure your Gmail address and 16-character Google App Password in .env to receive your login verification code."
        )

    # Generate cryptographically secure OTP and save bcrypt hash in database
    plain_otp, cooldown_err = create_and_store_otp(
        db,
        contact_target=user.email,
        purpose=OtpPurpose.LOGIN,
        user_id=user.id,
        enforce_cooldown=False
    )

    if not plain_otp:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=cooldown_err or "Please wait before requesting another verification code."
        )

    # Send actual email through Gmail SMTP
    sent, send_err = send_doctor_otp_email(
        doctor_name=user.full_name,
        to_email=user.email,
        otp_code=plain_otp
    )
    if not sent:
        log_audit_event(db, action="OTP_SEND_FAILED", user_id=user.id, user_email=user.email, status="FAILED", details=send_err)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Unable to send verification email: {send_err}"
        )

    log_audit_event(db, action="LOGIN_OTP_DISPATCHED", user_id=user.id, user_email=user.email, user_role=user.role)

    masked = mask_email(user.email)
    return {
        "success": True,
        "requires_otp": True,
        "message": "OTP sent to your email address.",
        "masked_email": masked,
        "email": user.email,
        "cooldown_seconds": settings.OTP_RESEND_COOLDOWN
    }

@router.post("/verify-login-otp")
def doctor_login_step2_verify(req: DoctorLoginVerifyRequest, db: Session = Depends(get_db)):
    """
    Step 2 of Doctor Authentication:
    Doctor enters OTP -> Backend verifies bcrypt hash -> Issues JWT session -> Doctor Dashboard.
    """
    clean_email = req.email.strip().lower()
    clean_otp = req.otp.strip()

    user = db.query(User).filter(User.email == clean_email).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Clinician account not found.")

    is_valid, msg = verify_otp_code(db, clean_email, clean_otp, OtpPurpose.LOGIN)
    if not is_valid:
        log_audit_event(db, action="OTP_VERIFY_FAILED", user_id=user.id, user_email=user.email, status="FAILED", details=msg)
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=msg)

    # Mark user as verified
    user.is_verified = True
    db.commit()

    token = create_access_token({"sub": user.id, "role": user.role, "email": user.email})
    log_audit_event(db, action="LOGIN_SUCCESS", user_id=user.id, user_email=user.email, user_role=user.role, details="Doctor login OTP verified")

    return {
        "success": True,
        "message": "Doctor verification successful. Welcome to DermaClass-Net.",
        "access_token": token,
        "token_type": "bearer",
        "user": format_user_response(user)
    }

@router.post("/resend-login-otp")
def resend_doctor_login_otp(req: DoctorResendOtpRequest, db: Session = Depends(get_db)):
    """Resends a new verification code to the doctor's email, enforcing 60s cooldown."""
    clean_email = req.email.strip().lower()
    user = db.query(User).filter(User.email == clean_email).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Clinician account not found.")

    if not is_smtp_configured():
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Email service is not configured. Please configure your Gmail address and 16-character Google App Password in .env."
        )

    plain_otp, cooldown_err = create_and_store_otp(
        db,
        contact_target=user.email,
        purpose=OtpPurpose.LOGIN,
        user_id=user.id,
        enforce_cooldown=True
    )

    if not plain_otp:
        raise HTTPException(status_code=status.HTTP_429_TOO_MANY_REQUESTS, detail=cooldown_err)

    sent, send_err = send_doctor_otp_email(
        doctor_name=user.full_name,
        to_email=user.email,
        otp_code=plain_otp
    )
    if not sent:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Unable to send verification email: {send_err}")

    masked = mask_email(user.email)
    return {
        "success": True,
        "message": "OTP sent to your email address.",
        "masked_email": masked,
        "cooldown_seconds": settings.OTP_RESEND_COOLDOWN
    }

@router.post("/doctor/signup", status_code=status.HTTP_201_CREATED)
def doctor_self_registration(req: DoctorRegisterRequest, db: Session = Depends(get_db)):
    """
    Doctor Registration Step 1:
    Creates/stages clinician profile with is_verified=False -> Sends 6-digit OTP to doctor's email via Gmail SMTP.
    Never exposes OTP in API response.
    """
    clean_email = req.email.strip().lower()
    existing = db.query(User).filter(User.email == clean_email).first()
    
    if existing and existing.is_verified:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An account with this email address already exists. Please log in."
        )

    if not is_smtp_configured():
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Email service is not configured. Please configure your Gmail address and 16-character Google App Password in .env to receive your registration verification code."
        )

    if existing and not existing.is_verified:
        # Re-use unverified staging user
        user = existing
        user.full_name = req.full_name
        user.phone = req.phone
        user.hashed_password = hash_password(req.password)
        doctor_code = user.doctor_profile.doctor_code if user.doctor_profile else "DR001"
    else:
        # Create fresh user
        user = User(
            email=clean_email,
            phone=req.phone,
            full_name=req.full_name,
            role=UserRole.DOCTOR,
            hashed_password=hash_password(req.password),
            is_verified=False,
            is_active=True
        )
        db.add(user)
        db.flush()

        doctor_count = db.query(DoctorProfile).count() + 1
        doctor_code = f"DR{doctor_count:03d}"
        doc_prof = DoctorProfile(
            user_id=user.id,
            doctor_code=doctor_code,
            license_number=req.license_number or f"MD-{doctor_count:05d}-DERM",
            specialization=req.specialization or "Cutaneous Oncology & Dermoscopy",
            hospital_affiliation=req.hospital_affiliation or "Pacific Coast Dermatology Institute",
            department=req.department or "Cutaneous Oncology",
            verification_status="PENDING"
        )
        db.add(doc_prof)

    db.commit()
    db.refresh(user)

    # Generate cryptographically secure OTP for registration verification
    plain_otp, cooldown_err = create_and_store_otp(
        db,
        contact_target=user.email,
        purpose=OtpPurpose.SIGNUP,
        user_id=user.id,
        enforce_cooldown=False
    )

    if not plain_otp:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=cooldown_err or "Please wait before requesting another verification code."
        )

    # Dispatch email via Gmail SMTP
    sent, send_err = send_signup_otp_email(
        full_name=user.full_name,
        to_email=user.email,
        otp_code=plain_otp
    )
    if not sent:
        log_audit_event(db, action="SIGNUP_OTP_SEND_FAILED", user_id=user.id, user_email=user.email, status="FAILED", details=send_err)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Unable to send registration verification email: {send_err}"
        )

    log_audit_event(db, action="USER_REGISTERED_PENDING_OTP", user_id=user.id, user_email=user.email, user_role=user.role, details=f"Doctor code {doctor_code}")

    masked = mask_email(user.email)
    return {
        "success": True,
        "requires_otp": True,
        "message": "OTP sent to your email address.",
        "email": user.email,
        "masked_email": masked,
        "cooldown_seconds": settings.OTP_RESEND_COOLDOWN,
        "doctor_code": doctor_code
    }

@router.post("/doctor/verify-signup")
@router.post("/verify-signup-otp")
def doctor_verify_signup(req: DoctorSignupVerifyRequest, db: Session = Depends(get_db)):
    """
    Doctor Registration Step 2:
    Doctor enters OTP -> Backend validates bcrypt hash -> Activates account (is_verified=True) -> Returns JWT session.
    """
    clean_email = req.email.strip().lower()
    clean_otp = req.otp.strip()

    user = db.query(User).filter(User.email == clean_email).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Clinician account not found.")

    is_valid, msg = verify_otp_code(db, clean_email, clean_otp, OtpPurpose.SIGNUP)
    if not is_valid:
        log_audit_event(db, action="SIGNUP_OTP_VERIFY_FAILED", user_id=user.id, user_email=user.email, status="FAILED", details=msg)
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=msg)

    # Activate and mark as verified
    user.is_verified = True
    if user.doctor_profile:
        user.doctor_profile.verification_status = "VERIFIED"
    db.commit()

    token = create_access_token({"sub": user.id, "role": user.role, "email": user.email})
    log_audit_event(db, action="USER_SIGNUP_VERIFIED", user_id=user.id, user_email=user.email, user_role=user.role, details="Doctor registration OTP verified successfully")

    return {
        "success": True,
        "message": "Registration verified successfully! Welcome to DermaClass-Net.",
        "access_token": token,
        "token_type": "bearer",
        "user": format_user_response(user)
    }

@router.post("/doctor/resend-signup-otp")
@router.post("/resend-signup-otp")
def resend_doctor_signup_otp(req: DoctorResendSignupOtpRequest, db: Session = Depends(get_db)):
    """Resends registration verification OTP, enforcing 60s cooldown."""
    clean_email = req.email.strip().lower()
    user = db.query(User).filter(User.email == clean_email).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Clinician account not found.")

    if user.is_verified:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="This account has already been verified. Please sign in.")

    if not is_smtp_configured():
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Email service is not configured. Please configure your Gmail address and 16-character Google App Password in .env."
        )

    plain_otp, cooldown_err = create_and_store_otp(
        db,
        contact_target=user.email,
        purpose=OtpPurpose.SIGNUP,
        user_id=user.id,
        enforce_cooldown=True
    )

    if not plain_otp:
        raise HTTPException(status_code=status.HTTP_429_TOO_MANY_REQUESTS, detail=cooldown_err)

    sent, send_err = send_signup_otp_email(
        full_name=user.full_name,
        to_email=user.email,
        otp_code=plain_otp
    )
    if not sent:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Unable to send verification email: {send_err}")

    masked = mask_email(user.email)
    return {
        "success": True,
        "message": "OTP sent to your email address.",
        "masked_email": masked,
        "cooldown_seconds": settings.OTP_RESEND_COOLDOWN
    }

@router.post("/forgot-password")
def forgot_password_request(req: ForgotPasswordRequest, db: Session = Depends(get_db)):
    """
    Step 1 of Forgot Password:
    Doctor enters registered email -> Generates OTP -> Sends via Gmail SMTP.
    Never exposes OTP in API response.
    """
    clean_email = req.email.strip().lower()
    user = db.query(User).filter(User.email == clean_email).first()

    if not user:
        # Prevent user enumeration with generic success message
        return {
            "success": True,
            "message": "OTP sent to your email address if an account exists.",
            "masked_email": mask_email(clean_email)
        }

    if not is_smtp_configured():
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Email service is not configured. Please configure your Gmail address and 16-character Google App Password in .env."
        )

    plain_otp, cooldown_err = create_and_store_otp(
        db,
        contact_target=user.email,
        purpose=OtpPurpose.PASSWORD_RESET,
        user_id=user.id,
        enforce_cooldown=True
    )

    if not plain_otp:
        raise HTTPException(status_code=status.HTTP_429_TOO_MANY_REQUESTS, detail=cooldown_err)

    sent, send_err = send_password_reset_otp_email(
        doctor_name=user.full_name,
        to_email=user.email,
        otp_code=plain_otp
    )
    if not sent:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Unable to send reset email: {send_err}")

    masked = mask_email(user.email)
    return {
        "success": True,
        "message": "OTP sent to your email address.",
        "masked_email": masked,
        "cooldown_seconds": settings.OTP_RESEND_COOLDOWN
    }

@router.post("/verify-reset-otp")
def verify_password_reset_otp(req: VerifyResetOtpRequest, db: Session = Depends(get_db)):
    """Validates the reset OTP before displaying the new password input form."""
    clean_email = req.email.strip().lower()
    clean_otp = req.otp.strip()

    is_valid, msg = verify_otp_code(db, clean_email, clean_otp, OtpPurpose.PASSWORD_RESET)
    if not is_valid:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=msg)

    return {
        "success": True,
        "message": "OTP verified successfully. You can now set your new password."
    }

@router.post("/reset-password")
def execute_password_reset(req: ResetPasswordRequest, db: Session = Depends(get_db)):
    """
    Step 2 of Forgot Password:
    Verifies OTP and updates doctor's password in database.
    """
    clean_email = req.email.strip().lower()
    user = db.query(User).filter(User.email == clean_email).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid password reset request.")

    # Invalidate/verify OTP
    is_valid, msg = verify_otp_code(db, clean_email, req.otp.strip(), OtpPurpose.PASSWORD_RESET)
    if not is_valid:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=msg)

    user.hashed_password = hash_password(req.new_password)
    db.commit()

    log_audit_event(db, action="PASSWORD_RESET_SUCCESS", user_id=user.id, user_email=user.email, user_role=user.role)
    return {
        "success": True,
        "message": "Password updated successfully. You can now log in with your new credentials."
    }

@router.post("/change-password")
def change_doctor_password(
    req: ChangePasswordRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Allows authenticated doctor to change their password."""
    if not verify_password(req.current_password, current_user.hashed_password):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Current password is incorrect.")

    current_user.hashed_password = hash_password(req.new_password)
    db.commit()

    log_audit_event(db, action="PASSWORD_CHANGED", user_id=current_user.id, user_email=current_user.email, user_role=current_user.role)
    return {
        "success": True,
        "message": "Password changed successfully."
    }

@router.get("/me")
def get_current_doctor_profile(current_user: User = Depends(get_current_user)):
    """Returns the authenticated doctor profile."""
    return {
        "success": True,
        "user": format_user_response(current_user)
    }
