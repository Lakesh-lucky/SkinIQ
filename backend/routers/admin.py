from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from backend.database import get_db
from backend.models.user import User, DoctorProfile, PatientProfile, UserRole
from backend.models.patient import Patient
from backend.models.scan import Scan
from backend.models.appointment import Appointment
from backend.models.support import SupportTicket
from backend.models.audit import AuditLog
from backend.routers.auth import get_current_user
from backend.services.audit_service import log_audit_event

router = APIRouter(prefix="/admin", tags=["Admin Portal"])

def require_admin(current_user: User = Depends(get_current_user)) -> User:
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Administrative privileges required to access this resource."
        )
    return current_user

@router.get("/stats")
def get_admin_system_stats(
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Returns actual real counts from the database."""
    total_users = db.query(User).count()
    total_doctors = db.query(DoctorProfile).count()
    verified_doctors = db.query(DoctorProfile).filter(DoctorProfile.verification_status == "VERIFIED").count()
    total_patients = db.query(Patient).count()
    total_scans = db.query(Scan).count()
    total_appointments = db.query(Appointment).count()
    open_tickets = db.query(SupportTicket).filter(SupportTicket.status.in_(["OPEN", "IN_PROGRESS"])).count()

    return {
        "success": True,
        "stats": {
            "total_users": total_users,
            "total_doctors": total_doctors,
            "verified_doctors": verified_doctors,
            "total_patients": total_patients,
            "total_scans": total_scans,
            "total_appointments": total_appointments,
            "open_tickets": open_tickets
        }
    }

@router.get("/users")
def list_all_users(
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    users = db.query(User).order_by(User.created_at.desc()).all()
    results = []
    for u in users:
        doc = u.doctor_profile
        results.append({
            "id": u.id,
            "email": u.email,
            "phone": u.phone,
            "full_name": u.full_name,
            "role": u.role,
            "is_verified": u.is_verified,
            "is_active": u.is_active,
            "doctor_code": doc.doctor_code if doc else None,
            "license_number": doc.license_number if doc else None,
            "verification_status": doc.verification_status if doc else None,
            "created_at": u.created_at.isoformat() if u.created_at else ""
        })
    return {"success": True, "users": results}

@router.put("/doctors/{doctor_id}/verify")
def set_doctor_verification(
    doctor_id: str,
    status_str: str = "VERIFIED", # VERIFIED or REJECTED
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    doc = db.query(DoctorProfile).filter(DoctorProfile.id == doctor_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Doctor profile not found.")

    doc.verification_status = status_str.upper()
    db.commit()

    log_audit_event(
        db,
        action="DOCTOR_VERIFICATION_STATUS_CHANGED",
        user_id=admin.id,
        user_email=admin.email,
        user_role=admin.role,
        entity_type="DoctorProfile",
        entity_id=doc.id,
        details=f"Doctor {doc.doctor_code} marked as {status_str}"
    )

    return {"success": True, "message": f"Doctor verification status updated to {status_str}."}

@router.get("/audit-logs")
def list_audit_logs(
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    logs = db.query(AuditLog).order_by(AuditLog.created_at.desc()).limit(100).all()
    results = []
    for l in logs:
        results.append({
            "id": l.id,
            "user_email": l.user_email or "System",
            "user_role": l.user_role or "N/A",
            "action": l.action,
            "entity_type": l.entity_type,
            "entity_id": l.entity_id,
            "status": l.status,
            "details": l.details,
            "created_at": l.created_at.isoformat() if l.created_at else ""
        })
    return {"success": True, "audit_logs": results}
