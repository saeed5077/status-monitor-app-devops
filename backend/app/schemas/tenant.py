from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List
from datetime import datetime
from uuid import UUID


# Tenant Schemas
class TenantBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    slug: str = Field(..., min_length=1, max_length=100)
    custom_domain: Optional[str] = Field(None, max_length=255)
    domain_verified: Optional[bool] = Field(default=False)
    logo_url: Optional[str] = Field(None, max_length=500)
    brand_color: Optional[str] = Field(default="#3B82F6", pattern=r"^#[0-9A-Fa-f]{6}$")


class TenantCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    email: EmailStr
    password: str = Field(..., min_length=8)


class TenantUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    logo_url: Optional[str] = Field(None, max_length=500)
    brand_color: Optional[str] = Field(None, pattern=r"^#[0-9A-Fa-f]{6}$")
    custom_domain: Optional[str] = Field(None, max_length=255)


class TenantResponse(TenantBase):
    id: UUID
    owner_email: EmailStr
    is_email_verified: bool
    created_at: datetime

    class Config:
        from_attributes = True


# Monitor Schemas
class MonitorBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    url: str = Field(..., min_length=1, max_length=500)
    check_interval_seconds: int = Field(default=60, ge=60, le=3600)
    send_email_alerts: bool = Field(default=True)


class MonitorCreate(MonitorBase):
    pass


class MonitorUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    url: Optional[str] = Field(None, min_length=1, max_length=500)
    check_interval_seconds: Optional[int] = Field(None, ge=60, le=3600)
    send_email_alerts: Optional[bool] = None


class MonitorResponse(MonitorBase):
    id: UUID
    tenant_id: UUID
    status: str
    last_checked_at: Optional[datetime]
    created_at: datetime

    class Config:
        from_attributes = True


class UptimeLogResponse(BaseModel):
    id: UUID
    monitor_id: UUID
    checked_at: datetime
    response_time_ms: Optional[int]
    status_code: Optional[int]
    is_up: bool

    class Config:
        from_attributes = True


class UptimeStats(BaseModel):
    date: str
    uptime_percentage: float
    total_checks: int
    up_checks: int


class MonitorWithUptimeResponse(MonitorResponse):
    uptime_stats: List[UptimeStats] = []


# Incident Schemas
class IncidentBase(BaseModel):
    title: str = Field(..., min_length=1, max_length=255)
    message: Optional[str] = None
    severity: str = Field(default="minor")  # minor, major, critical
    status: str = Field(default="investigating")  # investigating, identified, monitoring, resolved


class IncidentCreate(IncidentBase):
    monitor_id: Optional[UUID] = None


class IncidentUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=255)
    message: Optional[str] = None
    severity: Optional[str] = None  # minor, major, critical
    status: Optional[str] = None  # investigating, identified, monitoring, resolved


class IncidentResponse(IncidentBase):
    id: UUID
    tenant_id: UUID
    monitor_id: Optional[UUID]
    created_at: datetime
    resolved_at: Optional[datetime]
    duration_minutes: Optional[int] = None

    class Config:
        from_attributes = True


# Subscriber Schemas
class SubscriberBase(BaseModel):
    email: EmailStr


class SubscriberCreate(SubscriberBase):
    pass


class SubscriberResponse(SubscriberBase):
    id: UUID
    tenant_id: UUID
    confirmed: bool
    created_at: datetime

    class Config:
        from_attributes = True


# Auth Schemas
class VerifyEmailRequest(BaseModel):
    email: EmailStr
    otp: str = Field(..., min_length=6, max_length=6)


class ResendOtpRequest(BaseModel):
    email: EmailStr


class RegisterRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    email: EmailStr
    password: str = Field(..., min_length=8)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class AuthResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    tenant: TenantResponse


class UserMeResponse(BaseModel):
    id: UUID
    email: EmailStr
    tenant: TenantResponse


# Public Status Page Schema
class PublicMonitorStatus(BaseModel):
    id: UUID
    name: str
    status: str
    uptime_percentage_30d: float


class PublicIncidentStatus(BaseModel):
    id: UUID
    title: str
    message: Optional[str]
    severity: str
    status: str
    created_at: datetime
    resolved_at: Optional[datetime]
    affected_monitor: Optional[str] = None


class PublicStatusResponse(BaseModel):
    tenant: TenantResponse
    overall_status: str  # operational, degraded, outage
    monitors: List[PublicMonitorStatus]
    active_incidents: List[PublicIncidentStatus]
    recent_incidents: List[PublicIncidentStatus]


# Generic API Response Wrapper
class ApiResponse(BaseModel):
    success: bool
    message: str
    data: Optional[dict] = None
