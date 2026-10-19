from backend.routers.auth import router as auth_router
from backend.routers.patients import router as patients_router
from backend.routers.scans import router as scans_router
from backend.routers.appointments import router as appointments_router
from backend.routers.notifications import router as notifications_router
from backend.routers.support import router as support_router
from backend.routers.reports import router as reports_router
from backend.routers.admin import router as admin_router
from backend.routers.system import router as system_router

__all__ = [
    "auth_router",
    "patients_router",
    "scans_router",
    "appointments_router",
    "notifications_router",
    "support_router",
    "reports_router",
    "admin_router",
    "system_router"
]
