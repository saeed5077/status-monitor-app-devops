"""
Custom Domain Management & Caddy On-Demand TLS Integration

Flow:
1. User sets custom_domain in Settings
2. User clicks "Verify Domain" → POST /api/domains/verify
   - Backend resolves DNS (A / CNAME) for the domain
   - Checks that it points to our server IP (EXPECTED_IP env var)
   - If valid, sets domain_verified=True in DB
3. Caddy on-demand TLS calls GET /api/domains/caddy/ask?domain=X
   - Backend checks if domain exists in DB AND is verified
   - Returns 200 (proceed with cert) or 404 (deny cert)
4. Caddy reverse-proxies the request to the backend
5. Backend resolves tenant via custom_domain in public routes
"""

import socket
import os
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from app.core.database import get_db
from app.core.security import get_current_user
from app.models.tenant import Tenant

router = APIRouter(prefix="/api/domains", tags=["domains"])

# The IP address your Caddy / load balancer resolves to.
# Set via env var; for local dev, defaults to 127.0.0.1.
EXPECTED_SERVER_IP = os.getenv("EXPECTED_SERVER_IP", "127.0.0.1")
# Optionally accept a CNAME target (e.g. "status.yourplatform.com")
EXPECTED_CNAME_TARGET = os.getenv("EXPECTED_CNAME_TARGET", "")


class DomainVerifyRequest(BaseModel):
    domain: str


class DomainVerifyResponse(BaseModel):
    domain: str
    verified: bool
    message: str
    dns_records: list[str] = []


def resolve_dns(domain: str) -> dict:
    """
    Resolve A and CNAME records for a domain.
    Returns {'a_records': [...], 'cname': '...' or None, 'error': '...' or None}
    """
    result = {"a_records": [], "cname": None, "error": None}

    # Check CNAME
    try:
        cname = socket.getfqdn(domain)
        if cname and cname != domain:
            result["cname"] = cname
    except Exception:
        pass

    # Check A records
    try:
        a_records = socket.getaddrinfo(domain, None, socket.AF_INET, socket.SOCK_STREAM)
        ips = list(set(addr[4][0] for addr in a_records))
        result["a_records"] = ips
    except socket.gaierror as e:
        result["error"] = f"DNS resolution failed: {str(e)}"
    except Exception as e:
        result["error"] = f"Unexpected error: {str(e)}"

    return result


@router.post("/verify", response_model=DomainVerifyResponse)
async def verify_custom_domain(
    request: DomainVerifyRequest,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Verify that a custom domain's DNS records point to our server.
    Called by the user from the Settings page before Caddy will issue a cert.
    """
    domain = request.domain.strip().lower()

    if not domain:
        raise HTTPException(status_code=400, detail="Domain is required")

    # Get the tenant
    result = await db.execute(select(Tenant).where(Tenant.id == current_user["id"]))
    tenant = result.scalar_one_or_none()
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")

    # Check the domain matches what's saved (or save it)
    if tenant.custom_domain and tenant.custom_domain != domain:
        # User is changing domain — reset verification
        tenant.domain_verified = False

    tenant.custom_domain = domain

    # Resolve DNS
    dns = resolve_dns(domain)

    if dns["error"]:
        tenant.domain_verified = False
        await db.commit()
        return DomainVerifyResponse(
            domain=domain,
            verified=False,
            message=f"DNS lookup failed: {dns['error']}. Please add an A record or CNAME for {domain}.",
            dns_records=[]
        )

    # Check if any A record matches our expected IP
    ip_match = EXPECTED_SERVER_IP in dns["a_records"]

    # Check if CNAME matches our expected target
    cname_match = False
    if EXPECTED_CNAME_TARGET and dns["cname"]:
        cname_match = dns["cname"].rstrip(".").lower() == EXPECTED_CNAME_TARGET.rstrip(".").lower()

    all_records = [f"A → {ip}" for ip in dns["a_records"]]
    if dns["cname"]:
        all_records.append(f"CNAME → {dns['cname']}")

    if ip_match or cname_match:
        tenant.domain_verified = True
        await db.commit()
        await db.refresh(tenant)
        return DomainVerifyResponse(
            domain=domain,
            verified=True,
            message="Domain verified! DNS is correctly pointing to our server. Caddy will automatically provision a TLS certificate.",
            dns_records=all_records
        )
    else:
        tenant.domain_verified = False
        await db.commit()
        return DomainVerifyResponse(
            domain=domain,
            verified=False,
            message=f"DNS records found but don't point to our server ({EXPECTED_SERVER_IP}). Please update your A record or CNAME.",
            dns_records=all_records
        )


@router.get("/caddy/ask")
async def caddy_ask(
    domain: str = Query(..., description="Domain that Caddy wants to get a cert for"),
    db: AsyncSession = Depends(get_db)
):
    """
    Caddy on-demand TLS 'ask' endpoint.

    Caddy calls this before issuing a certificate for a domain.
    - 200 = proceed, issue cert
    - 404 = deny, do not issue cert

    Caddy config should have:
      tls {
        on_demand {
          ask http://backend:8000/api/domains/caddy/ask
        }
      }
    """
    domain = domain.strip().lower()

    # Check if domain exists in DB AND is verified
    result = await db.execute(
        select(Tenant).where(
            Tenant.custom_domain == domain,
            Tenant.domain_verified == True  # noqa: E712 — SQLAlchemy requires ==
        )
    )
    tenant = result.scalar_one_or_none()

    if tenant:
        # Domain is verified — Caddy should proceed with cert
        return {"domain": domain, "allowed": True}

    # Domain not found or not verified — deny cert
    raise HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail="Domain not authorized for TLS"
    )


@router.get("/status")
async def get_domain_status(
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get the current domain verification status for the logged-in tenant."""
    result = await db.execute(select(Tenant).where(Tenant.id == current_user["id"]))
    tenant = result.scalar_one_or_none()
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")

    return {
        "custom_domain": tenant.custom_domain,
        "domain_verified": tenant.domain_verified,
    }
