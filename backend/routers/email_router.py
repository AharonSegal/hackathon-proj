import uuid
from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from database import get_db
from models.message import MessageLog
from schemas.message import EmailSend, MessageLogOut
from services.email_service import send_email

router = APIRouter(prefix="/messages/email", tags=["email"])


@router.post("/", response_model=MessageLogOut, status_code=201)
async def send_or_schedule_email(body: EmailSend, db: Session = Depends(get_db)):
    now = datetime.now(timezone.utc)
    scheduled_at = datetime.fromisoformat(body.schedule_at) if body.schedule_at else now
    recipient_str = ", ".join(body.to)

    log = MessageLog(
        id=str(uuid.uuid4()),
        type="email",
        status="pending",
        recipient=recipient_str,
        subject=body.subject,
        message=body.body,
        scheduled_at=scheduled_at,
        event_id=body.event_id,
    )
    db.add(log)
    db.commit()

    if not body.schedule_at:
        try:
            await send_email(body.to, body.subject, body.body)
            log.status = "sent"
            log.sent_at = datetime.now(timezone.utc)
        except Exception as e:
            log.status = "failed"
            log.error = str(e)
            db.commit()
            raise HTTPException(502, f"Email send failed: {e}")
        db.commit()

    db.refresh(log)
    return log


@router.post("/test")
async def test_email(body: dict):
    to = body.get("to")
    if not to:
        raise HTTPException(400, "Missing 'to' field")
    try:
        await send_email([to], "Test from Calendar App", "This is a test email from your Calendar App ✅")
        return {"ok": True}
    except Exception as e:
        raise HTTPException(502, str(e))
