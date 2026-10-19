from typing import Optional, List
from pydantic import BaseModel, Field

class SupportMessageCreateRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=2000)

class SupportMessageResponse(BaseModel):
    id: str
    ticket_id: str
    sender_id: str
    sender_name: str
    sender_role: str
    message: str
    created_at: str

class SupportTicketCreateRequest(BaseModel):
    category: str = "General" # Account, Login/OTP, Report, Scan, Appointment, Technical Issue, Other
    subject: str = Field(..., min_length=3, max_length=200)
    message: str = Field(..., min_length=5, max_length=3000)
    priority: str = "NORMAL"

class SupportTicketResponse(BaseModel):
    id: str
    ticket_code: str
    user_id: str
    user_name: str
    user_email: str
    user_role: str
    category: str
    subject: str
    status: str
    priority: str
    assigned_admin_name: Optional[str] = None
    created_at: str
    updated_at: str
    messages: List[SupportMessageResponse] = []
