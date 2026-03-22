"""
APScheduler-based background scheduler.
Polls pending messages and sends them when their scheduled_at time arrives.
"""
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from database import SessionLocal
from models.message import MessageLog
from services.whatsapp_service import send_whatsapp_message
from services.email_service import send_email
import logging

logger = logging.getLogger(__name__)

scheduler = AsyncIOScheduler(timezone="UTC")


async def process_pending_messages() -> None:
    """Check for due messages and send them."""
    db: Session = SessionLocal()
    try:
        now = datetime.now(timezone.utc)
        pending = (
            db.query(MessageLog)
            .filter(MessageLog.status == "pending", MessageLog.scheduled_at <= now)
            .all()
        )

        for log in pending:
            try:
                if log.type == "whatsapp":
                    await send_whatsapp_message(log.recipient, log.message)
                elif log.type == "email":
                    # subject is stored separately; recipient may be comma-separated
                    to_list = [r.strip() for r in log.recipient.split(",")]
                    await send_email(to_list, log.subject or "", log.message)

                log.status = "sent"
                log.sent_at = datetime.now(timezone.utc)
                logger.info("Sent %s message to %s (id=%s)", log.type, log.recipient, log.id)

            except Exception as exc:
                log.status = "failed"
                log.error = str(exc)
                logger.error("Failed to send %s message id=%s: %s", log.type, log.id, exc)

        db.commit()
    finally:
        db.close()


def start_scheduler() -> None:
    scheduler.add_job(
        process_pending_messages,
        "interval",
        minutes=1,
        id="send_messages",
        replace_existing=True,
    )
    scheduler.start()
    logger.info("Scheduler started — checking messages every 60 s")


def stop_scheduler() -> None:
    scheduler.shutdown(wait=False)
