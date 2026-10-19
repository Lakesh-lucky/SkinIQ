from backend.schemas.auth import (
    UserLoginRequest,
    DoctorLoginVerifyRequest,
    DoctorResendOtpRequest,
    DoctorRegisterRequest,
    ForgotPasswordRequest,
    VerifyResetOtpRequest,
    ResetPasswordRequest,
    ChangePasswordRequest,
    DoctorProfileResponse,
    UserResponse
)
from backend.schemas.patient import (
    PatientCreateRequest,
    PatientResponse
)
from backend.schemas.scan import (
    PredictionResponse,
    ScanResponse,
    DoctorReviewCreateRequest,
    DoctorReviewResponse
)
from backend.schemas.appointment import (
    AppointmentCreateRequest,
    AppointmentStatusUpdateRequest,
    AppointmentResponse
)
from backend.schemas.notification import (
    NotificationResponse
)
from backend.schemas.report import (
    MedicalReportResponse,
    ShareReportRequest,
    ShareReportResponse
)
from backend.schemas.system import (
    HealthCheckResponse,
    ModelInfoResponse
)
