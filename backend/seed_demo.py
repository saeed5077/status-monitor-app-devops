"""Seed script to create demo tenant with sample data"""
import asyncio
import uuid
from datetime import datetime, timedelta
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.database import engine, Base, get_db
from app.models.tenant import Tenant, Monitor, UptimeLog, Incident, MonitorStatus, IncidentSeverity, IncidentStatus
from app.core.security import get_password_hash


async def seed_demo_data():
    """Create demo tenant with sample monitors and data"""
    async with engine.begin() as conn:
        # Check if demo tenant exists
        result = await conn.execute(
            select(Tenant).where(Tenant.slug == "demo")
        )
        existing = result.scalar_one_or_none()
        
        if existing:
            print("[SEED] Demo tenant already exists")
            return
        
        # Create demo tenant
        tenant_id = uuid.uuid4()
        await conn.execute(
            Tenant.__table__.insert().values(
                id=tenant_id,
                name="Demo Company",
                slug="demo",
                custom_domain=None,
                logo_url=None,
                brand_color="#ef4444",
                owner_email="demo@example.com",
                owner_password_hash=get_password_hash("demo123"),
                created_at=datetime.utcnow()
            )
        )
        print(f"[SEED] Created demo tenant: {tenant_id}")
        
        # Create sample monitors
        monitors_data = [
            ("API", "https://api.demo.com/health", MonitorStatus.OPERATIONAL),
            ("Website", "https://demo.com", MonitorStatus.OPERATIONAL),
            ("Database", "https://db.demo.com/status", MonitorStatus.OPERATIONAL),
            ("CDN", "https://cdn.demo.com", MonitorStatus.OPERATIONAL),
        ]
        
        monitor_ids = []
        for name, url, status in monitors_data:
            monitor_id = uuid.uuid4()
            await conn.execute(
                Monitor.__table__.insert().values(
                    id=monitor_id,
                    tenant_id=tenant_id,
                    name=name,
                    url=url,
                    check_interval_seconds=60,
                    status=status,
                    last_checked_at=datetime.utcnow(),
                    created_at=datetime.utcnow()
                )
            )
            monitor_ids.append((monitor_id, name))
        
        print(f"[SEED] Created {len(monitors_data)} monitors")
        
        # Create uptime logs for last 30 days
        for monitor_id, name in monitor_ids:
            logs = []
            for i in range(30 * 24):  # 30 days, hourly checks
                checked_at = datetime.utcnow() - timedelta(hours=i)
                is_up = True if i > 5 else (i % 7 != 0)  # Mostly up, some downtime
                logs.append({
                    "id": uuid.uuid4(),
                    "monitor_id": monitor_id,
                    "checked_at": checked_at,
                    "response_time_ms": 50 + (i % 100),
                    "status_code": 200 if is_up else 500,
                    "is_up": is_up
                })
            
            # Batch insert uptime logs
            if logs:
                await conn.execute(
                    UptimeLog.__table__.insert().values(logs)
                )
        
        print(f"[SEED] Created uptime logs for all monitors")
        
        # Create a sample resolved incident
        incident_id = uuid.uuid4()
        await conn.execute(
            Incident.__table__.insert().values(
                id=incident_id,
                tenant_id=tenant_id,
                monitor_id=monitor_ids[0][0],  # API monitor
                title="API Response Time Degradation",
                message="We experienced elevated response times due to database query optimization. The issue has been resolved.",
                severity=IncidentSeverity.MINOR,
                status=IncidentStatus.RESOLVED,
                created_at=datetime.utcnow() - timedelta(days=2),
                resolved_at=datetime.utcnow() - timedelta(days=2, hours=-2)
            )
        )
        
        print(f"[SEED] Created sample incident")
        print(f"[SEED] Demo data complete! Visit: http://136.112.96.142:3000/status/demo")


if __name__ == "__main__":
    asyncio.run(seed_demo_data())
