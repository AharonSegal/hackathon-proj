from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from database import get_db
from models.message import MessageLog
from schemas.message import MessageLogOut

router = APIRouter(prefix="/messages", tags=["messages"])


@router.get("/logs", response_model=list[MessageLogOut])
def get_message_logs(db: Session = Depends(get_db)):
    logs = db.query(MessageLog).order_by(MessageLog.scheduled_at.desc()).limit(200).all()
    return logs
