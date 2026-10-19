from typing import Optional
from sqlalchemy.orm import Session
from backend.models.audit import AuditLog

def log_audit_event(
    db: Session,
    action: str,
    user_id: Optional[str] = None,
    user_email: Optional[str] = None,
    user_role: Optional[str] = None,
    entity_type: Optional[str] = None,
    entity_id: Optional[str] = None,
    ip_address: str = "127.0.0.1",
    status: str = "SUCCESS",
    details: Optional[str] = None
) -> AuditLog:
    """Records an audit log entry in the database."""
    log_entry = AuditLog(
        user_id=user_id,
        user_email=user_email,
        user_role=user_role,
        action=action,
        entity_type=entity_type,
        entity_id=entity_id,
        ip_address=ip_address,
        status=status,
        details=details
    )
    db.add(log_entry)
    db.commit()
    return log_entry
