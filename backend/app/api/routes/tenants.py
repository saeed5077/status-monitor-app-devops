from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.core.database import get_db
from app.core.security import get_current_user
from app.models.tenant import Tenant
from app.schemas.tenant import TenantUpdate, TenantResponse, ApiResponse

router = APIRouter(prefix="/api/tenants", tags=["tenants"])


@router.get("/me", response_model=TenantResponse)
async def get_my_tenant(
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(Tenant).where(Tenant.id == current_user["id"]))
    tenant = result.scalar_one_or_none()
    
    if not tenant:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Tenant not found"
        )
    
    return TenantResponse.model_validate(tenant)


@router.put("/me", response_model=TenantResponse)
async def update_my_tenant(
    request: TenantUpdate,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(Tenant).where(Tenant.id == current_user["id"]))
    tenant = result.scalar_one_or_none()
    
    if not tenant:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Tenant not found"
        )
    
    # Check custom domain uniqueness if provided
    if request.custom_domain and request.custom_domain != tenant.custom_domain:
        result = await db.execute(
            select(Tenant).where(
                Tenant.custom_domain == request.custom_domain,
                Tenant.id != tenant.id
            )
        )
        if result.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Custom domain already in use"
            )
    
    # Update fields
    update_data = request.model_dump(exclude_unset=True)
    
    # Fix Postgres 500 Constraint Error: Convert empty string to None so it saves as NULL
    if 'custom_domain' in update_data and update_data['custom_domain'] == "":
        update_data['custom_domain'] = None
    
    # Reset domain_verified if custom_domain is changing
    if 'custom_domain' in update_data and update_data['custom_domain'] != tenant.custom_domain:
        tenant.domain_verified = False
    
    for field, value in update_data.items():
        if field != 'domain_verified':  # domain_verified is managed by /api/domains/verify
            setattr(tenant, field, value)
    
    await db.commit()
    await db.refresh(tenant)
    
    return TenantResponse.model_validate(tenant)
