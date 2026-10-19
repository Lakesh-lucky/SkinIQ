from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from backend.database import get_db
from backend.models.user import User, UserRole
from backend.models.support import SupportTicket, SupportMessage
from backend.schemas.support import SupportTicketCreateRequest, SupportMessageCreateRequest
from backend.routers.auth import get_current_user
from backend.services.notification_service import create_in_app_notification
from backend.services.audit_service import log_audit_event

router = APIRouter(prefix="/support", tags=["Support & Help"])

@router.post("/tickets", status_code=status.HTTP_201_CREATED)
def create_support_ticket(
    req: SupportTicketCreateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """User creates a new support ticket."""
    ticket_count = db.query(SupportTicket).count() + 1
    ticket_code = f"SUP-{ticket_count:04d}"

    ticket = SupportTicket(
        ticket_code=ticket_code,
        user_id=current_user.id,
        category=req.category,
        subject=req.subject,
        status="OPEN",
        priority=req.priority
    )
    db.add(ticket)
    db.flush()

    initial_msg = SupportMessage(
        ticket_id=ticket.id,
        sender_id=current_user.id,
        sender_name=current_user.full_name,
        sender_role=current_user.role,
        message=req.message
    )
    db.add(initial_msg)
    db.commit()
    db.refresh(ticket)

    # In-app notification to all admins
    admins = db.query(User).filter(User.role == UserRole.ADMIN).all()
    for adm in admins:
        create_in_app_notification(
            db,
            user_id=adm.id,
            title="New Support Request",
            message=f"New support ticket #{ticket_code} created by {current_user.full_name}: '{req.subject}'.",
            notification_type="SUPPORT_RESPONSE",
            reference_id=ticket.id
        )

    log_audit_event(
        db,
        action="SUPPORT_TICKET_CREATED",
        user_id=current_user.id,
        user_email=current_user.email,
        user_role=current_user.role,
        entity_type="SupportTicket",
        entity_id=ticket.id,
        details=f"Code: {ticket_code}, Category: {req.category}"
    )

    return {
        "success": True,
        "message": f"Support ticket #{ticket_code} submitted successfully. An administrator will respond shortly.",
        "ticket": {
            "id": ticket.id,
            "ticket_code": ticket.ticket_code,
            "category": ticket.category,
            "subject": ticket.subject,
            "status": ticket.status,
            "priority": ticket.priority,
            "created_at": ticket.created_at.isoformat()
        }
    }


@router.get("/tickets")
def list_support_tickets(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Lists support tickets for the current user or all tickets for admin."""
    if current_user.role == UserRole.ADMIN:
        tickets = db.query(SupportTicket).order_by(SupportTicket.updated_at.desc()).all()
    else:
        tickets = db.query(SupportTicket).filter(SupportTicket.user_id == current_user.id).order_by(SupportTicket.updated_at.desc()).all()

    results = []
    for t in tickets:
        msgs = []
        for m in t.messages:
            msgs.append({
                "id": m.id,
                "ticket_id": m.ticket_id,
                "sender_id": m.sender_id,
                "sender_name": m.sender_name,
                "sender_role": m.sender_role,
                "message": m.message,
                "created_at": m.created_at.isoformat() if m.created_at else ""
            })

        results.append({
            "id": t.id,
            "ticket_code": t.ticket_code,
            "user_id": t.user_id,
            "user_name": t.user.full_name if t.user else "User",
            "user_email": t.user.email if t.user else "",
            "user_role": t.user.role if t.user else "",
            "category": t.category,
            "subject": t.subject,
            "status": t.status,
            "priority": t.priority,
            "assigned_admin_name": t.assigned_admin.full_name if t.assigned_admin else None,
            "created_at": t.created_at.isoformat() if t.created_at else "",
            "updated_at": t.updated_at.isoformat() if t.updated_at else "",
            "messages": msgs
        })

    return {"success": True, "tickets": results}


@router.post("/tickets/{ticket_id}/messages")
def send_ticket_message(
    ticket_id: str,
    req: SupportMessageCreateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    ticket = db.query(SupportTicket).filter(SupportTicket.id == ticket_id).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Support ticket not found.")

    if current_user.role != UserRole.ADMIN and ticket.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied.")

    msg = SupportMessage(
        ticket_id=ticket.id,
        sender_id=current_user.id,
        sender_name=current_user.full_name,
        sender_role=current_user.role,
        message=req.message
    )
    db.add(msg)

    # If admin responds, update status & notify user
    if current_user.role == UserRole.ADMIN:
        ticket.status = "IN_PROGRESS"
        ticket.assigned_admin_id = current_user.id
        create_in_app_notification(
            db,
            user_id=ticket.user_id,
            title=f"Support Response: #{ticket.ticket_code}",
            message=f"Administrator {current_user.full_name} has responded to your ticket: '{ticket.subject}'.",
            notification_type="SUPPORT_RESPONSE",
            reference_id=ticket.id
        )
    else:
        ticket.status = "WAITING_FOR_USER" if ticket.status == "OPEN" else "IN_PROGRESS"

    ticket.updated_at = datetime.utcnow()
    db.commit()

    return {
        "success": True,
        "message": "Message sent.",
        "message_record": {
            "id": msg.id,
            "ticket_id": msg.ticket_id,
            "sender_id": msg.sender_id,
            "sender_name": msg.sender_name,
            "sender_role": msg.sender_role,
            "message": msg.message,
            "created_at": msg.created_at.isoformat()
        }
    }
