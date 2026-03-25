from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, cast, Date, Integer
from datetime import datetime, timedelta
from typing import List
from app.core.database import get_db
from app.core.security import get_current_user
from app.models.tenant import Monitor, Tenant, UptimeLog, MonitorStatus
from app.schemas.tenant import MonitorCreate, MonitorUpdate, MonitorResponse, MonitorWithUptimeResponse, UptimeStats, ApiResponse
from uuid import UUID

router = APIRouter(prefix="/api/monitors", tags=["monitors"])


@router.get("", response_model=List[MonitorResponse])
async def list_monitors(
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(Monitor).where(Monitor.tenant_id == current_user["id"]).order_by(Monitor.created_at.desc())
    )
    monitors = result.scalars().all()
    return [MonitorResponse.model_validate(m) for m in monitors]


@router.post("", response_model=MonitorResponse, status_code=status.HTTP_201_CREATED)
async def create_monitor(
    request: MonitorCreate,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    # Validate check interval
    if request.check_interval_seconds not in [60, 300, 600]:
        request.check_interval_seconds = 60
    
    monitor = Monitor(
        tenant_id=current_user["id"],
        name=request.name,
        url=request.url,
        check_interval_seconds=request.check_interval_seconds,
        status=MonitorStatus.OPERATIONAL
    )
    
    db.add(monitor)
    await db.commit()
    await db.refresh(monitor)
    
    return MonitorResponse.model_validate(monitor)


@router.put("/{monitor_id}", response_model=MonitorResponse)
async def update_monitor(
    monitor_id: UUID,
    request: MonitorUpdate,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(Monitor).where(
            Monitor.id == monitor_id,
            Monitor.tenant_id == current_user["id"]
        )
    )
    monitor = result.scalar_one_or_none()
    
    if not monitor:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Monitor not found"
        )
    
    update_data = request.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(monitor, field, value)
    
    await db.commit()
    await db.refresh(monitor)
    
    return MonitorResponse.model_validate(monitor)


@router.delete("/{monitor_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_monitor(
    monitor_id: UUID,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(Monitor).where(
            Monitor.id == monitor_id,
            Monitor.tenant_id == current_user["id"]
        )
    )
    monitor = result.scalar_one_or_none()
    
    if not monitor:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Monitor not found"
        )
    
    await db.delete(monitor)
    await db.commit()
    
    return None


@router.get("/{monitor_id}/uptime", response_model=MonitorWithUptimeResponse)
async def get_monitor_uptime(
    monitor_id: UUID,
    days: int = Query(default=30, ge=1, le=90),
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(Monitor).where(
            Monitor.id == monitor_id,
            Monitor.tenant_id == current_user["id"]
        )
    )
    monitor = result.scalar_one_or_none()
    
    if not monitor:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Monitor not found"
        )
    
    # Calculate uptime stats for each day
    start_date = datetime.utcnow() - timedelta(days=days)
    
    result = await db.execute(
        select(
            cast(UptimeLog.checked_at, Date).label("date"),
            func.count().label("total_checks"),
            func.sum(func.cast(UptimeLog.is_up, Integer)).label("up_checks")
        )
        .where(
            UptimeLog.monitor_id == monitor_id,
            UptimeLog.checked_at >= start_date
        )
        .group_by(cast(UptimeLog.checked_at, Date))
        .order_by(cast(UptimeLog.checked_at, Date))
    )
    
    uptime_stats = []
    for row in result.all():
        total = row.total_checks
        up = row.up_checks or 0
        uptime_percentage = (up / total * 100) if total > 0 else 100.0
        uptime_stats.append(UptimeStats(
            date=str(row.date),
            uptime_percentage=round(uptime_percentage, 2),
            total_checks=total,
            up_checks=up
        ))
    
    response = MonitorWithUptimeResponse.model_validate(monitor)
    response.uptime_stats = uptime_stats
    
    return response
