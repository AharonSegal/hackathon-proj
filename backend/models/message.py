from sqlalchemy import Column, String, DateTime, Text
from sqlalchemy.sql import func
from database import Base


class MessageLog(Base):
    __tablename__ = "message_logs"

    id = Column(String, primary_key=True)
    type = Column(String, nullable=False)       # 'email' | 'whatsapp'
    status = Column(String, default="pending")  # 'pending' | 'sent' | 'failed'
    recipient = Column(String, nullable=False)
    subject = Column(String, nullable=True)
    message = Column(Text, nullable=False)
    scheduled_at = Column(DateTime, nullable=False)
    sent_at = Column(DateTime, nullable=True)
    error = Column(Text, nullable=True)
    event_id = Column(String, nullable=True)
    created_at = Column(DateTime, server_default=func.now())
