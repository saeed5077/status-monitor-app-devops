import uuid
from datetime import datetime
from sqlalchemy import Column, String, DateTime, ForeignKey, Integer, Boolean, Text, Enum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.core.database import Base
import enum


class MonitorStatus(str, enum.Enum):
    OPERATIONAL = "operational"
    DEGRADED = "degraded"
    OUTAGE = "outage"


class IncidentSeverity(str, enum.Enum):
    MINOR = "minor"
    MAJOR = "major"
    CRITICAL = "critical"


class IncidentStatus(str, enum.Enum):
    INVESTIGATING = "investigating"
    IDENTIFIED = "identified"
    MONITORING = "monitoring"
    RESOLVED = "resolved"


class Tenant(Base):
    __tablename__ = "tenants"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(255), nullable=False)
    slug = Column(String(100), unique=True, nullable=False, index=True)
    custom_domain = Column(String(255), unique=True, nullable=True, index=True)
    domain_verified = Column(Boolean, default=False)
    logo_url = Column(String(500), nullable=True)
    brand_color = Column(String(7), default="#3B82F6")  # Hex color
    owner_email = Column(String(255), nullable=False, index=True)
    owner_password_hash = Column(String(255), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    monitors = relationship("Monitor", back_populates="tenant", cascade="all, delete-orphan")
    incidents = relationship("Incident", back_populates="tenant", cascade="all, delete-orphan")
    subscribers = relationship("Subscriber", back_populates="tenant", cascade="all, delete-orphan")


class Monitor(Base):
    __tablename__ = "monitors"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id = Column(UUID(as_uuid=True), ForeignKey("tenants.id"), nullable=False, index=True)
    name = Column(String(255), nullable=False)
    url = Column(String(500), nullable=False)
    check_interval_seconds = Column(Integer, default=60)  # 60, 300, 600
    status = Column(Enum(MonitorStatus), default=MonitorStatus.OPERATIONAL)
    last_checked_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    tenant = relationship("Tenant", back_populates="monitors")
    uptime_logs = relationship("UptimeLog", back_populates="monitor", cascade="all, delete-orphan")
    incidents = relationship("Incident", back_populates="monitor")


class UptimeLog(Base):
    __tablename__ = "uptime_logs"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    monitor_id = Column(UUID(as_uuid=True), ForeignKey("monitors.id"), nullable=False, index=True)
    checked_at = Column(DateTime, default=datetime.utcnow, index=True)
    response_time_ms = Column(Integer, nullable=True)
    status_code = Column(Integer, nullable=True)
    is_up = Column(Boolean, default=True)
    
    # Relationships
    monitor = relationship("Monitor", back_populates="uptime_logs")


class Incident(Base):
    __tablename__ = "incidents"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id = Column(UUID(as_uuid=True), ForeignKey("tenants.id"), nullable=False, index=True)
    monitor_id = Column(UUID(as_uuid=True), ForeignKey("monitors.id"), nullable=True, index=True)
    title = Column(String(255), nullable=False)
    message = Column(Text, nullable=True)
    severity = Column(Enum(IncidentSeverity), default=IncidentSeverity.MINOR)
    status = Column(Enum(IncidentStatus), default=IncidentStatus.INVESTIGATING)
    created_at = Column(DateTime, default=datetime.utcnow)
    resolved_at = Column(DateTime, nullable=True)
    
    # Relationships
    tenant = relationship("Tenant", back_populates="incidents")
    monitor = relationship("Monitor", back_populates="incidents")


class Subscriber(Base):
    __tablename__ = "subscribers"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id = Column(UUID(as_uuid=True), ForeignKey("tenants.id"), nullable=False, index=True)
    email = Column(String(255), nullable=False)
    confirmed = Column(Boolean, default=False)
    token = Column(String(255), unique=True, nullable=False, index=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    tenant = relationship("Tenant", back_populates="subscribers")
