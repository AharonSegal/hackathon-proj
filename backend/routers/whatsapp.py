import uuid
from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException
from sqlalchemy.orm import Session
from fastapi import Depends
from database import get_db
from models.message import MessageLog
from schemas.message import WhatsAppSend, MessageLogOut
from services.whatsapp_service import send_whatsapp_message

router = APIRouter(prefix="/messages/whatsapp", tags=["whatsapp"])


@router.post("/", response_model=MessageLogOut, status_code=201)
async def send_or_schedule_whatsapp(body: WhatsAppSend, db: Session = Depends(get_db)):
    now = datetime.now(timezone.utc)
    scheduled_at = datetime.fromisoformat(body.schedule_at) if body.schedule_at else now

    log = MessageLog(
        id=str(uuid.uuid4()),
        type="whatsapp",
        status="pending",
        recipient=body.to,
        message=body.message,
        scheduled_at=scheduled_at,
        event_id=body.event_id,
    )
    db.add(log)
    db.commit()

    # Send immediately if no schedule
    if not body.schedule_at:
        try:
            await send_whatsapp_message(body.to, body.message)
            log.status = "sent"
            log.sent_at = datetime.now(timezone.utc)
        except Exception as e:
            log.status = "failed"
            log.error = str(e)
            db.commit()
            raise HTTPException(502, f"WhatsApp send failed: {e}")
        db.commit()

    db.refresh(log)
    return log


@router.post("/test")
async def test_whatsapp(body: dict):
    to = body.get("to")
    if not to:
        raise HTTPException(400, "Missing 'to' field")
    try:
        result = await send_whatsapp_message(to, "✅ Test message from Calendar App!")
        return {"ok": True, "result": result}
    except Exception as e:
        raise HTTPException(502, str(e))
