from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.tenant import Tenant


async def get_tenant_by_domain_or_slug(db: AsyncSession, domain_or_slug: str) -> Tenant:
    """
    Resolve a tenant by custom domain first, then by slug.
    This is used for the public status page routing.
    """
    # Try custom domain first
    result = await db.execute(
        select(Tenant).where(Tenant.custom_domain == domain_or_slug)
    )
    tenant = result.scalar_one_or_none()
    
    if tenant:
        return tenant
    
    # Fall back to slug
    result = await db.execute(
        select(Tenant).where(Tenant.slug == domain_or_slug)
    )
    tenant = result.scalar_one_or_none()
    
    return tenant


async def validate_custom_domain(db: AsyncSession, domain: str, exclude_tenant_id: str = None) -> bool:
    """
    Validate that a custom domain is not already in use.
    Returns True if available, False otherwise.
    """
    query = select(Tenant).where(Tenant.custom_domain == domain)
    
    if exclude_tenant_id:
        query = query.where(Tenant.id != exclude_tenant_id)
    
    result = await db.execute(query)
    existing = result.scalar_one_or_none()
    
    return existing is None
