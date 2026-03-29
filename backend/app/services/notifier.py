from jinja2 import Template
from app.core.config import get_settings
from app.models.tenant import Tenant, Subscriber, Incident, Monitor

settings = get_settings()


# Email templates
CONFIRMATION_EMAIL_TEMPLATE = """
<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .button { display: inline-block; padding: 12px 24px; background-color: {{ brand_color }}; color: white; text-decoration: none; border-radius: 4px; }
        .footer { margin-top: 30px; font-size: 12px; color: #666; }
    </style>
</head>
<body>
    <div class="container">
        <h2>Confirm Your Subscription</h2>
        <p>Hello,</p>
        <p>You've requested to receive status updates for <strong>{{ tenant_name }}</strong>.</p>
        <p>Please click the button below to confirm your subscription:</p>
        <p><a href="{{ confirm_url }}" class="button">Confirm Subscription</a></p>
        <p>Or copy and paste this link into your browser:<br>{{ confirm_url }}</p>
        <div class="footer">
            <p>If you didn't request this subscription, you can ignore this email.</p>
        </div>
    </div>
</body>
</html>
"""

INCIDENT_CREATED_TEMPLATE = """
<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .incident-box { background-color: #f8f8f8; padding: 20px; border-left: 4px solid {{ severity_color }}; margin: 20px 0; }
        .status { color: {{ severity_color }}; font-weight: bold; }
        .footer { margin-top: 30px; font-size: 12px; color: #666; border-top: 1px solid #eee; padding-top: 20px; }
    </style>
</head>
<body>
    <div class="container">
        <h2>New Incident: {{ incident_title }}</h2>
        <div class="incident-box">
            <p><strong>Status:</strong> <span class="status">{{ incident_status }}</span></p>
            <p><strong>Severity:</strong> {{ incident_severity }}</p>
            <p><strong>Affected Service:</strong> {{ monitor_name }}</p>
            <p><strong>Description:</strong></p>
            <p>{{ incident_message }}</p>
            <p><strong>Started:</strong> {{ created_at }}</p>
        </div>
        <p>View the status page: <a href="{{ status_page_url }}">{{ status_page_url }}</a></p>
        <div class="footer">
            <p>You received this because you're subscribed to {{ tenant_name }} status updates.</p>
            <p><a href="{{ unsubscribe_url }}">Unsubscribe</a></p>
        </div>
    </div>
</body>
</html>
"""

INCIDENT_RESOLVED_TEMPLATE = """
<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .incident-box { background-color: #f0fff4; padding: 20px; border-left: 4px solid #22c55e; margin: 20px 0; }
        .status { color: #22c55e; font-weight: bold; }
        .footer { margin-top: 30px; font-size: 12px; color: #666; border-top: 1px solid #eee; padding-top: 20px; }
    </style>
</head>
<body>
    <div class="container">
        <h2>Incident Resolved: {{ incident_title }}</h2>
        <div class="incident-box">
            <p><strong>Status:</strong> <span class="status">RESOLVED</span></p>
            <p><strong>Affected Service:</strong> {{ monitor_name }}</p>
            <p><strong>Duration:</strong> {{ duration }}</p>
            <p><strong>Resolved at:</strong> {{ resolved_at }}</p>
        </div>
        <p>All systems are now operational. View the status page: <a href="{{ status_page_url }}">{{ status_page_url }}</a></p>
        <div class="footer">
            <p>You received this because you're subscribed to {{ tenant_name }} status updates.</p>
            <p><a href="{{ unsubscribe_url }}">Unsubscribe</a></p>
        </div>
    </div>
</body>
</html>
"""

OTP_EMAIL_TEMPLATE = """
<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .otp-box { background-color: #f8f8f8; padding: 20px; text-align: center; border-radius: 8px; margin: 20px 0; border: 1px solid #eee; }
        .otp-code { font-size: 32px; font-weight: bold; letter-spacing: 5px; color: {{ brand_color }}; }
        .footer { margin-top: 30px; font-size: 12px; color: #666; border-top: 1px solid #eee; padding-top: 20px; }
    </style>
</head>
<body>
    <div class="container">
        <h2>Verify Your Email</h2>
        <p>Hello,</p>
        <p>Thank you for signing up for <strong>{{ tenant_name }}</strong>. To complete your registration, please use the following verification code:</p>
        <div class="otp-box">
            <div class="otp-code">{{ otp_code }}</div>
        </div>
        <p>This code will expire in 15 minutes.</p>
        <div class="footer">
            <p>If you didn't attempt to sign up, you can safely ignore this email.</p>
        </div>
    </div>
</body>
</html>
"""


def get_severity_color(severity: str) -> str:
    colors = {
        "minor": "#f59e0b",
        "major": "#f97316",
        "critical": "#ef4444"
    }
    return colors.get(severity, "#6b7280")


async def send_email(to_email: str, subject: str, html_content: str):
    """Send email via Resend API"""
    if not hasattr(settings, 'RESEND_API_KEY') or not settings.RESEND_API_KEY:
        print(f"[EMAIL] Would send to {to_email}: {subject}")
        return
    
    try:
        import resend
        resend.api_key = settings.RESEND_API_KEY
        
        params = {
            "from": settings.FROM_EMAIL or "onboarding@resend.dev",
            "to": [to_email],
            "subject": subject,
            "html": html_content,
        }
        resend.Emails.send(params)
        
        print(f"[EMAIL] Sent via Resend to {to_email}: {subject}")
    except Exception as e:
        print(f"[EMAIL ERROR] Failed to send via Resend to {to_email}: {e}")


async def send_confirmation_email(tenant: Tenant, subscriber: Subscriber):
    """Send subscription confirmation email"""
    confirm_url = f"{settings.FRONTEND_URL}/api/subscribers/confirm/{subscriber.token}"
    
    template = Template(CONFIRMATION_EMAIL_TEMPLATE)
    html = template.render(
        tenant_name=tenant.name,
        brand_color=tenant.brand_color,
        confirm_url=confirm_url
    )
    
    await send_email(subscriber.email, f"Confirm your subscription to {tenant.name}", html)


async def send_incident_created_notification(
    tenant: Tenant,
    incident: Incident,
    monitor: Monitor,
    subscribers: list
):
    """Send incident creation notifications to all confirmed subscribers"""
    status_page_url = f"{settings.FRONTEND_URL}/status/{tenant.slug}"
    severity_color = get_severity_color(incident.severity.value)
    
    template = Template(INCIDENT_CREATED_TEMPLATE)
    
    for subscriber in subscribers:
        if not subscriber.confirmed:
            continue
            
        unsubscribe_url = f"{settings.FRONTEND_URL}/api/subscribers/unsubscribe/{subscriber.token}"
        
        html = template.render(
            tenant_name=tenant.name,
            incident_title=incident.title,
            incident_status=incident.status.value,
            incident_severity=incident.severity.value,
            incident_message=incident.message or "No additional details provided.",
            monitor_name=monitor.name if monitor else "Multiple Services",
            created_at=incident.created_at.strftime("%Y-%m-%d %H:%M UTC"),
            status_page_url=status_page_url,
            unsubscribe_url=unsubscribe_url,
            severity_color=severity_color
        )
        
        await send_email(
            subscriber.email,
            f"[{incident.severity.value.upper()}] Incident: {incident.title} - {tenant.name}",
            html
        )


async def send_incident_resolved_notification(
    tenant: Tenant,
    incident: Incident,
    monitor: Monitor,
    subscribers: list,
    duration_minutes: int
):
    """Send incident resolution notifications to all confirmed subscribers"""
    status_page_url = f"{settings.FRONTEND_URL}/status/{tenant.slug}"
    
    # Format duration
    if duration_minutes < 60:
        duration = f"{duration_minutes} minutes"
    else:
        hours = duration_minutes // 60
        mins = duration_minutes % 60
        duration = f"{hours} hours {mins} minutes" if mins > 0 else f"{hours} hours"
    
    template = Template(INCIDENT_RESOLVED_TEMPLATE)
    
    for subscriber in subscribers:
        if not subscriber.confirmed:
            continue
            
        unsubscribe_url = f"{settings.FRONTEND_URL}/api/subscribers/unsubscribe/{subscriber.token}"
        
        html = template.render(
            tenant_name=tenant.name,
            incident_title=incident.title,
            monitor_name=monitor.name if monitor else "Multiple Services",
            resolved_at=incident.resolved_at.strftime("%Y-%m-%d %H:%M UTC") if incident.resolved_at else "Unknown",
            duration=duration,
            status_page_url=status_page_url,
            unsubscribe_url=unsubscribe_url
        )
        
        await send_email(
            subscriber.email,
            f"[RESOLVED] Incident: {incident.title} - {tenant.name}",
            html
        )


async def notify_monitor_down(tenant: Tenant, monitor: Monitor, subscribers: list):
    """Notify tenant owner and subscribers when monitor goes down"""
    # This would create an incident and send notifications
    # Implementation in monitor_worker
    pass


async def notify_monitor_up(tenant: Tenant, monitor: Monitor, subscribers: list):
    """Notify tenant owner and subscribers when monitor recovers"""
    # This would resolve an incident and send notifications
    # Implementation in monitor_worker
    pass


async def send_otp_email(email: str, tenant_name: str, brand_color: str, otp_code: str):
    """Send 6-digit OTP email for account verification"""
    template = Template(OTP_EMAIL_TEMPLATE)
    html = template.render(
        tenant_name=tenant_name,
        brand_color=brand_color,
        otp_code=otp_code
    )
    
    await send_email(email, f"Verify your email for {tenant_name}", html)
