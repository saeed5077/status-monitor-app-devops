from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from datetime import datetime
from typing import List, Optional
from app.core.database import get_db
from app.core.security import get_current_user
from app.models.tenant import Incident, Tenant, Monitor, IncidentStatus
from app.schemas.tenant import IncidentCreate, IncidentUpdate, IncidentResponse, ApiResponse
from uuid import UUID

router = APIRouter(prefix="/api/incidents", tags=["incidents"])


def calculate_duration_minutes(created_at: datetime, resolved_at: Optional[datetime]) -> Optional[int]:
    if resolved_at:
        return int((resolved_at - created_at).total_seconds() / 60)
    return None


@router.get("", response_model=List[IncidentResponse])
async def list_incidents(
    status: Optional[str] = None,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    query = select(Incident).where(Incident.tenant_id == current_user["id"])
    
    if status:
        if status == "active":
            query = query.where(Incident.status != IncidentStatus.RESOLVED)
        elif status == "resolved":
            query = query.where(Incident.status == IncidentStatus.RESOLVED)
    
    query = query.order_by(Incident.created_at.desc())
    
    result = await db.execute(query)
    incidents = result.scalars().all()
    
    responses = []
    for incident in incidents:
        resp = IncidentResponse.model_validate(incident)
        resp.duration_minutes = calculate_duration_minutes(incident.created_at, incident.resolved_at)
        responses.append(resp)
    
    return responses


@router.post("", response_model=IncidentResponse, status_code=status.HTTP_201_CREATED)
async def create_incident(
    request: IncidentCreate,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    # Validate monitor if provided
    if request.monitor_id:
        result = await db.execute(
            select(Monitor).where(
                Monitor.id == request.monitor_id,
                Monitor.tenant_id == current_user["id"]
            )
        )
        if not result.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Monitor not found"
            )
    
    incident = Incident(
        tenant_id=current_user["id"],
        monitor_id=request.monitor_id,
        title=request.title,
        message=request.message,
        severity=request.severity,
        status=request.status
    )
    
    db.add(incident)
    await db.commit()
    await db.refresh(incident)
    
    resp = IncidentResponse.model_validate(incident)
    resp.duration_minutes = None
    return resp


@router.put("/{incident_id}", response_model=IncidentResponse)
async def update_incident(
    incident_id: UUID,
    request: IncidentUpdate,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(Incident).where(
            Incident.id == incident_id,
            Incident.tenant_id == current_user["id"]
        )
    )
    incident = result.scalar_one_or_none()
    
    if not incident:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Incident not found"
        )
    
    update_data = request.model_dump(exclude_unset=True)
    
    # Handle status change to resolved
    if request.status == "resolved" and incident.status != IncidentStatus.RESOLVED:
        incident.resolved_at = datetime.utcnow()
    
    for field, value in update_data.items():
        setattr(incident, field, value)
    
    await db.commit()
    await db.refresh(incident)
    
    resp = IncidentResponse.model_validate(incident)
    resp.duration_minutes = calculate_duration_minutes(incident.created_at, incident.resolved_at)
    return resp


@router.delete("/{incident_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_incident(
    incident_id: UUID,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(Incident).where(
            Incident.id == incident_id,
            Incident.tenant_id == current_user["id"]
        )
    )
    incident = result.scalar_one_or_none()
    
    if not incident:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Incident not found"
        )
    
    await db.delete(incident)
    await db.commit()
    
    return None
