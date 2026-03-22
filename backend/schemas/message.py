from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class WhatsAppSend(BaseModel):
    to: str
    message: str
    schedule_at: Optional[str] = None
    event_id: Optional[str] = None


class EmailSend(BaseModel):
    to: list[str]
    subject: str
    body: str
    schedule_at: Optional[str] = None
    event_id: Optional[str] = None


class MessageLogOut(BaseModel):
    id: str
    type: str
    status: str
    recipient: str
    subject: Optional[str] = None
    message: str
    scheduled_at: datetime
    sent_at: Optional[datetime] = None
    error: Optional[str] = None
    event_id: Optional[str] = None

    model_config = {"from_attributes": True}
