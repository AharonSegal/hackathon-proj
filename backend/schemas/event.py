from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime


class ScheduledEmail(BaseModel):
    id: str = ""
    to: List[str]
    subject: str
    body: str
    scheduled_at: str
    sent: bool = False
    sent_at: Optional[str] = None


class ScheduledWhatsApp(BaseModel):
    id: str = ""
    to: str
    message: str
    scheduled_at: str
    sent: bool = False
    sent_at: Optional[str] = None
    template_name: Optional[str] = None


class EventCreate(BaseModel):
    title: str
    description: Optional[str] = None
    date: str
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    color: str = "indigo"
    all_day: bool = True
    scheduled_email: Optional[ScheduledEmail] = None
    scheduled_whatsapp: Optional[ScheduledWhatsApp] = None


class EventUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    date: Optional[str] = None
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    color: Optional[str] = None
    all_day: Optional[bool] = None
    scheduled_email: Optional[ScheduledEmail] = None
    scheduled_whatsapp: Optional[ScheduledWhatsApp] = None


class EventOut(BaseModel):
    id: str
    title: str
    description: Optional[str] = None
    date: str
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    color: str
    all_day: bool
    scheduled_email: Optional[ScheduledEmail] = None
    scheduled_whatsapp: Optional[ScheduledWhatsApp] = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
