from fastapi import APIRouter, HTTPException, status, Query, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, cast, Date, and_, Integer
from datetime import datetime, timedelta
from typing import List
from app.core.database import get_db
from app.models.tenant import Tenant, Monitor, UptimeLog, Incident, Subscriber, MonitorStatus, IncidentStatus
from app.schemas.tenant import (
    PublicStatusResponse, PublicMonitorStatus, PublicIncidentStatus,
    TenantResponse, UptimeStats
)

router = APIRouter(prefix="/api/public", tags=["public"])


async def resolve_tenant(slug_or_domain: str, db: AsyncSession) -> Tenant:
    """Resolve tenant by custom domain first, then by slug"""
    # Try custom domain first
    result = await db.execute(
        select(Tenant).where(Tenant.custom_domain == slug_or_domain)
    )
    tenant = result.scalar_one_or_none()
    
    if not tenant:
        # Fall back to slug
        result = await db.execute(
            select(Tenant).where(Tenant.slug == slug_or_domain)
        )
        tenant = result.scalar_one_or_none()
    
    if not tenant:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Status page not found"
        )
    
    return tenant


def determine_overall_status(monitors: List[Monitor]) -> str:
    if not monitors:
        return "operational"
    
    statuses = [m.status for m in monitors]
    
    if MonitorStatus.OUTAGE in statuses:
        return "major_outage"
    elif MonitorStatus.DEGRADED in statuses:
        return "degraded"
    else:
        return "operational"


@router.get("/{tenant_slug_or_domain}", response_model=PublicStatusResponse)
async def get_public_status(
    tenant_slug_or_domain: str,
    db: AsyncSession = Depends(get_db)
):
    tenant = await resolve_tenant(tenant_slug_or_domain, db)
    
    # Get monitors
    result = await db.execute(
        select(Monitor).where(Monitor.tenant_id == tenant.id)
    )
    monitors = result.scalars().all()
    
    # Calculate uptime for each monitor (last 30 days)
    monitor_statuses = []
    for monitor in monitors:
        start_date = datetime.utcnow() - timedelta(days=30)
        result = await db.execute(
            select(
                func.count().label("total"),
                func.sum(func.cast(UptimeLog.is_up, Integer)).label("up")
            )
            .where(
                UptimeLog.monitor_id == monitor.id,
                UptimeLog.checked_at >= start_date
            )
        )
        row = result.one()
        total = row.total or 0
        up = row.up or 0
        uptime_pct = (up / total * 100) if total > 0 else 100.0
        
        monitor_statuses.append(PublicMonitorStatus(
            id=monitor.id,
            name=monitor.name,
            status=monitor.status.value,
            uptime_percentage_30d=round(uptime_pct, 2)
        ))
    
    # Get active incidents
    result = await db.execute(
        select(Incident)
        .where(
            Incident.tenant_id == tenant.id,
            Incident.status != IncidentStatus.RESOLVED
        )
        .order_by(Incident.created_at.desc())
    )
    active_incidents = result.scalars().all()
    
    # Get recent resolved incidents (last 30 days)
    thirty_days_ago = datetime.utcnow() - timedelta(days=30)
    result = await db.execute(
        select(Incident)
        .where(
            Incident.tenant_id == tenant.id,
            Incident.status == IncidentStatus.RESOLVED,
            Incident.resolved_at >= thirty_days_ago
        )
        .order_by(Incident.resolved_at.desc())
        .limit(10)
    )
    recent_incidents = result.scalars().all()
    
    # Build response
    active_incident_responses = []
    for inc in active_incidents:
        monitor_name = None
        if inc.monitor_id:
            result = await db.execute(
                select(Monitor).where(Monitor.id == inc.monitor_id)
            )
            monitor = result.scalar_one_or_none()
            if monitor:
                monitor_name = monitor.name
        
        active_incident_responses.append(PublicIncidentStatus(
            id=inc.id,
            title=inc.title,
            message=inc.message,
            severity=inc.severity.value,
            status=inc.status.value,
            created_at=inc.created_at,
            resolved_at=inc.resolved_at,
            affected_monitor=monitor_name
        ))
    
    recent_incident_responses = []
    for inc in recent_incidents:
        monitor_name = None
        if inc.monitor_id:
            result = await db.execute(
                select(Monitor).where(Monitor.id == inc.monitor_id)
            )
            monitor = result.scalar_one_or_none()
            if monitor:
                monitor_name = monitor.name
        
        recent_incident_responses.append(PublicIncidentStatus(
            id=inc.id,
            title=inc.title,
            message=inc.message,
            severity=inc.severity.value,
            status=inc.status.value,
            created_at=inc.created_at,
            resolved_at=inc.resolved_at,
            affected_monitor=monitor_name
        ))
    
    overall_status = determine_overall_status(list(monitors))
    
    return PublicStatusResponse(
        tenant=TenantResponse.model_validate(tenant),
        overall_status=overall_status,
        monitors=monitor_statuses,
        active_incidents=active_incident_responses,
        recent_incidents=recent_incident_responses
    )


@router.get("/{tenant_slug_or_domain}/history")
async def get_history(
    tenant_slug_or_domain: str,
    days: int = Query(default=90, ge=1, le=365),
    db: AsyncSession = Depends(get_db)
):
    tenant = await resolve_tenant(tenant_slug_or_domain, db)
    
    # Get monitors
    result = await db.execute(
        select(Monitor).where(Monitor.tenant_id == tenant.id)
    )
    monitors = result.scalars().all()
    
    # Get uptime history for each monitor
    start_date = datetime.utcnow() - timedelta(days=days)
    
    history = {}
    for monitor in monitors:
        result = await db.execute(
            select(
                cast(UptimeLog.checked_at, Date).label("date"),
                func.count().label("total_checks"),
                func.sum(func.cast(UptimeLog.is_up, Integer)).label("up_checks")
            )
            .where(
                UptimeLog.monitor_id == monitor.id,
                UptimeLog.checked_at >= start_date
            )
            .group_by(cast(UptimeLog.checked_at, Date))
            .order_by(cast(UptimeLog.checked_at, Date))
        )
        
        daily_stats = []
        for row in result.all():
            total = row.total_checks
            up = row.up_checks or 0
            uptime_pct = (up / total * 100) if total > 0 else 100.0
            daily_stats.append({
                "date": str(row.date),
                "uptime_percentage": round(uptime_pct, 2),
                "total_checks": total,
                "up_checks": up
            })
        
        history[str(monitor.id)] = {
            "name": monitor.name,
            "daily_stats": daily_stats
        }
    
    return {
        "success": True,
        "data": history
    }
