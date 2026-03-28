import asyncio
import httpx
from datetime import datetime
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.interval import IntervalTrigger

from app.core.database import AsyncSessionLocal
from app.core.redis import publish_message
from app.models.tenant import Monitor, Tenant, UptimeLog, Incident, Subscriber, MonitorStatus, IncidentSeverity, IncidentStatus
from app.services.notifier import send_incident_created_notification, send_incident_resolved_notification

scheduler = AsyncIOScheduler()


async def check_monitor(monitor_id: str):
    """Check a single monitor and update its status"""
    async with AsyncSessionLocal() as db:
        try:
            # Get monitor with tenant
            result = await db.execute(
                select(Monitor, Tenant)
                .join(Tenant, Monitor.tenant_id == Tenant.id)
                .where(Monitor.id == monitor_id)
            )
            row = result.one_or_none()
            
            if not row:
                return
            
            monitor, tenant = row
            
            # Perform HTTP check
            start_time = datetime.utcnow()
            is_up = False
            response_time_ms = None
            status_code = None
            error_message = None
            
            try:
                async with httpx.AsyncClient(timeout=30.0) as client:
                    response = await client.get(monitor.url, follow_redirects=True)
                    status_code = response.status_code
                    end_time = datetime.utcnow()
                    response_time_ms = int((end_time - start_time).total_seconds() * 1000)
                    
                    # Consider 2xx and 3xx as up
                    is_up = 200 <= status_code < 400
            except Exception as e:
                error_message = str(e)
                is_up = False
            
            # Create uptime log
            uptime_log = UptimeLog(
                monitor_id=monitor.id,
                checked_at=datetime.utcnow(),
                response_time_ms=response_time_ms,
                status_code=status_code,
                is_up=is_up
            )
            db.add(uptime_log)
            
            # Update monitor last checked
            monitor.last_checked_at = datetime.utcnow()
            
            # Determine previous status
            previous_status = monitor.status
            
            # Update monitor status based on check
            if is_up:
                if monitor.status == MonitorStatus.OUTAGE:
                    monitor.status = MonitorStatus.OPERATIONAL
            else:
                if monitor.status == MonitorStatus.OPERATIONAL:
                    monitor.status = MonitorStatus.OUTAGE
            
            # Check if status changed
            if previous_status != monitor.status:
                # Get confirmed subscribers
                result = await db.execute(
                    select(Subscriber)
                    .where(
                        Subscriber.tenant_id == tenant.id,
                        Subscriber.confirmed == True
                    )
                )
                subscribers = result.scalars().all()
                
                if monitor.status == MonitorStatus.OUTAGE:
                    # Create incident
                    incident = Incident(
                        tenant_id=tenant.id,
                        monitor_id=monitor.id,
                        title=f"{monitor.name} is down",
                        message=f"Service is unreachable. Status code: {status_code}. Error: {error_message}" if not is_up else None,
                        severity=IncidentSeverity.MAJOR,
                        status=IncidentStatus.INVESTIGATING
                    )
                    db.add(incident)
                    await db.flush()
                    
                    # Publish to Redis for WebSocket
                    await publish_message(
                        f"tenant:{tenant.id}",
                        f'{{"type": "incident_created", "monitor_id": "{monitor.id}", "incident_id": "{incident.id}"}}'
                    )
                    
                    # Send notifications if enabled
                    if monitor.send_email_alerts:
                        await send_incident_created_notification(tenant, incident, monitor, subscribers)
                    
                elif monitor.status == MonitorStatus.OPERATIONAL and previous_status == MonitorStatus.OUTAGE:
                    # Find and resolve open incident for this monitor
                    result = await db.execute(
                        select(Incident)
                        .where(
                            Incident.monitor_id == monitor.id,
                            Incident.status != IncidentStatus.RESOLVED
                        )
                    )
                    incident = result.scalar_one_or_none()
                    
                    if incident:
                        incident.status = IncidentStatus.RESOLVED
                        incident.resolved_at = datetime.utcnow()
                        
                        # Calculate duration
                        duration_minutes = int((incident.resolved_at - incident.created_at).total_seconds() / 60)
                        
                        # Publish to Redis for WebSocket
                        await publish_message(
                            f"tenant:{tenant.id}",
                            f'{{"type": "incident_resolved", "monitor_id": "{monitor.id}", "incident_id": "{incident.id}"}}'
                        )
                        
                        # Send notifications if enabled
                        if monitor.send_email_alerts:
                            await send_incident_resolved_notification(tenant, incident, monitor, subscribers, duration_minutes)
            
            await db.commit()
            
            # Publish status update to Redis
            await publish_message(
                f"tenant:{tenant.id}",
                f'{{"type": "status_update", "monitor_id": "{monitor.id}", "status": "{monitor.status.value}", "is_up": {str(is_up).lower()}}}'
            )
            
        except Exception as e:
            print(f"[MONITOR ERROR] Error checking monitor {monitor_id}: {e}")
            await db.rollback()


async def check_all_monitors():
    """Check all monitors that are due"""
    async with AsyncSessionLocal() as db:
        try:
            result = await db.execute(select(Monitor))
            monitors = result.scalars().all()
            
            for monitor in monitors:
                # Check if monitor is due (based on last_checked_at)
                should_check = False
                
                if monitor.last_checked_at is None:
                    should_check = True
                else:
                    elapsed = (datetime.utcnow() - monitor.last_checked_at).total_seconds()
                    should_check = elapsed >= monitor.check_interval_seconds
                
                if should_check:
                    # Schedule immediate check
                    asyncio.create_task(check_monitor(str(monitor.id)))
                    
        except Exception as e:
            print(f"[SCHEDULER ERROR] Error in check_all_monitors: {e}")


def start_monitor_scheduler():
    """Start the APScheduler with monitor jobs"""
    # Add job to check monitors every 60 seconds
    scheduler.add_job(
        check_all_monitors,
        trigger=IntervalTrigger(seconds=60),
        id="monitor_checker",
        name="Check all monitors",
        replace_existing=True
    )
    
    scheduler.start()
    print("[SCHEDULER] Monitor scheduler started")


def stop_monitor_scheduler():
    """Stop the scheduler"""
    scheduler.shutdown()
    print("[SCHEDULER] Monitor scheduler stopped")
