import random
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.core.database import get_db
from app.core.security import get_password_hash, verify_password, create_access_token, get_current_user
from app.models.tenant import Tenant
from app.schemas.tenant import (
    RegisterRequest, LoginRequest, AuthResponse, TenantResponse, 
    UserMeResponse, ApiResponse, VerifyEmailRequest, ResendOtpRequest
)
from datetime import datetime, timedelta
from app.services.notifier import send_otp_email

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/register", response_model=ApiResponse)
async def register(
    request: RegisterRequest,
    db: AsyncSession = Depends(get_db)
):
    # Check if email already exists
    result = await db.execute(select(Tenant).where(Tenant.owner_email == request.email))
    if result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    # Generate slug from name
    slug = request.name.lower().replace(" ", "-").replace("_", "-")
    slug = "".join(c for c in slug if c.isalnum() or c == "-")
    
    # Check if slug exists and append number if needed
    base_slug = slug
    counter = 1
    while True:
        result = await db.execute(select(Tenant).where(Tenant.slug == slug))
        if not result.scalar_one_or_none():
            break
        slug = f"{base_slug}-{counter}"
        counter += 1
    
    # Generate OTP
    otp_code = str(random.randint(100000, 999999))
    
    # Create tenant
    tenant = Tenant(
        name=request.name,
        slug=slug,
        owner_email=request.email,
        owner_password_hash=get_password_hash(request.password),
        brand_color="#3B82F6",
        is_email_verified=False,
        email_otp=otp_code,
        email_otp_expires_at=datetime.utcnow() + timedelta(minutes=15)
    )
    
    db.add(tenant)
    await db.commit()
    await db.refresh(tenant)
    
    # Send OTP Email
    await send_otp_email(tenant.owner_email, tenant.name, tenant.brand_color, otp_code)
    
    return ApiResponse(
        success=True, 
        message="Registration successful. Please verify your email.",
        data={"email": tenant.owner_email}
    )


@router.post("/login", response_model=AuthResponse)
async def login(
    request: LoginRequest,
    db: AsyncSession = Depends(get_db)
):
    # Find tenant by email
    result = await db.execute(select(Tenant).where(Tenant.owner_email == request.email))
    tenant = result.scalar_one_or_none()
    
    if not tenant or not verify_password(request.password, tenant.owner_password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )
        
    if not tenant.is_email_verified:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Email not verified"
        )
    
    # Generate access token
    access_token = create_access_token(
        data={"sub": str(tenant.id), "email": tenant.owner_email},
        expires_delta=timedelta(days=7)
    )
    
    return AuthResponse(
        access_token=access_token,
        tenant=TenantResponse.model_validate(tenant)
    )


@router.post("/verify-email", response_model=AuthResponse)
async def verify_email(
    request: VerifyEmailRequest,
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(Tenant).where(Tenant.owner_email == request.email))
    tenant = result.scalar_one_or_none()
    
    if not tenant:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
        
    if tenant.is_email_verified:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email already verified")
        
    if not tenant.email_otp or tenant.email_otp != request.otp:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid verification code")
        
    if tenant.email_otp_expires_at and tenant.email_otp_expires_at < datetime.utcnow():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Verification code expired")
        
    # Verify success
    tenant.is_email_verified = True
    tenant.email_otp = None
    tenant.email_otp_expires_at = None
    await db.commit()
    
    # Generate access token upon successful verification
    access_token = create_access_token(
        data={"sub": str(tenant.id), "email": tenant.owner_email},
        expires_delta=timedelta(days=7)
    )
    
    return AuthResponse(
        access_token=access_token,
        tenant=TenantResponse.model_validate(tenant)
    )


@router.post("/resend-otp", response_model=ApiResponse)
async def resend_otp(
    request: ResendOtpRequest,
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(Tenant).where(Tenant.owner_email == request.email))
    tenant = result.scalar_one_or_none()
    
    if not tenant:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
        
    if tenant.is_email_verified:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email already verified")
        
    # Generate new OTP
    otp_code = str(random.randint(100000, 999999))
    tenant.email_otp = otp_code
    tenant.email_otp_expires_at = datetime.utcnow() + timedelta(minutes=15)
    
    await db.commit()
    
    # Send email
    await send_otp_email(tenant.owner_email, tenant.name, tenant.brand_color, otp_code)
    
    return ApiResponse(success=True, message="Verification code resent successfully")


@router.get("/me", response_model=UserMeResponse)
async def get_me(
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
    
    return UserMeResponse(
        id=tenant.id,
        email=tenant.owner_email,
        tenant=TenantResponse.model_validate(tenant)
    )
