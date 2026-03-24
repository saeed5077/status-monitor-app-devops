from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from datetime import datetime
from typing import List
import secrets
from app.core.database import get_db
from app.core.security import get_current_user
from app.core.config import get_settings
from app.services.notifier import send_confirmation_email
from app.models.tenant import Subscriber, Tenant, IncidentStatus
from app.schemas.tenant import SubscriberCreate, SubscriberResponse, ApiResponse
from uuid import UUID

router = APIRouter(prefix="/api/subscribers", tags=["subscribers"])
settings = get_settings()


@router.post("", response_model=ApiResponse)
async def create_subscriber(
    request: SubscriberCreate,
    tenant_slug: str,
    db: AsyncSession = Depends(get_db)
):
    # Find tenant by slug
    result = await db.execute(select(Tenant).where(Tenant.slug == tenant_slug))
    tenant = result.scalar_one_or_none()
    
    if not tenant:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Tenant not found"
        )
    
    # Check if email already subscribed
    result = await db.execute(
        select(Subscriber).where(
            Subscriber.tenant_id == tenant.id,
            Subscriber.email == request.email
        )
    )
    existing = result.scalar_one_or_none()
    
    if existing:
        if existing.confirmed:
            return ApiResponse(success=False, message="Email already subscribed")
        else:
            # Resend confirmation
            await send_confirmation_email(tenant, existing)
            return ApiResponse(
                success=True,
                message="Confirmation email sent. Please check your inbox."
            )
    
    # Create subscriber with confirmation token
    token = secrets.token_urlsafe(32)
    subscriber = Subscriber(
        tenant_id=tenant.id,
        email=request.email,
        token=token,
        confirmed=False
    )
    
    db.add(subscriber)
    await db.commit()
    await db.refresh(subscriber)
    
    # Send confirmation email
    await send_confirmation_email(tenant, subscriber)
    
    return ApiResponse(
        success=True,
        message="Please check your email to confirm your subscription."
    )


@router.get("/confirm/{token}", response_model=ApiResponse)
async def confirm_subscriber(
    token: str,
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(Subscriber).where(Subscriber.token == token))
    subscriber = result.scalar_one_or_none()
    
    if not subscriber:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invalid confirmation token"
        )
    
    if subscriber.confirmed:
        return ApiResponse(success=True, message="Email already confirmed")
    
    subscriber.confirmed = True
    await db.commit()
    
    return ApiResponse(
        success=True,
        message="Your subscription has been confirmed!"
    )


@router.get("/unsubscribe/{token}", response_model=ApiResponse)
async def unsubscribe(
    token: str,
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(Subscriber).where(Subscriber.token == token))
    subscriber = result.scalar_one_or_none()
    
    if not subscriber:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invalid unsubscribe token"
        )
    
    await db.delete(subscriber)
    await db.commit()
    
    return ApiResponse(
        success=True,
        message="You have been unsubscribed successfully."
    )


@router.get("", response_model=List[SubscriberResponse])
async def list_subscribers(
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(Subscriber)
        .where(Subscriber.tenant_id == current_user["id"])
        .order_by(Subscriber.created_at.desc())
    )
    subscribers = result.scalars().all()
    return [SubscriberResponse.model_validate(s) for s in subscribers]
