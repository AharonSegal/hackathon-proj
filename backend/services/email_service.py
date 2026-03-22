"""
Email sending via aiosmtplib (async SMTP).
Reads credentials from .env settings.
"""
import aiosmtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from database import settings


async def send_email(
    to: list[str],
    subject: str,
    body: str,
    from_name: str | None = None,
) -> None:
    """Send a plain-text / HTML email via SMTP."""
    smtp_host = settings.smtp_host
    smtp_port = settings.smtp_port
    smtp_user = settings.smtp_user
    from_name = from_name or settings.email_from_name

    # Read password from env (not stored in DB for security)
    import os
    smtp_password = os.getenv("SMTP_PASSWORD", "")

    if not smtp_user:
        raise ValueError("SMTP credentials not configured")

    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = f"{from_name} <{smtp_user}>"
    msg["To"] = ", ".join(to)

    # Plain text part
    msg.attach(MIMEText(body, "plain", "utf-8"))

    await aiosmtplib.send(
        msg,
        hostname=smtp_host,
        port=smtp_port,
        username=smtp_user,
        password=smtp_password,
        start_tls=True,
    )
