from sqlalchemy import Column, String, Boolean, DateTime, JSON
from sqlalchemy.sql import func
from database import Base


class Event(Base):
    __tablename__ = "events"

    id = Column(String, primary_key=True)
    title = Column(String, nullable=False)
    description = Column(String, nullable=True)
    date = Column(String, nullable=False)      # YYYY-MM-DD
    start_time = Column(String, nullable=True)  # HH:mm
    end_time = Column(String, nullable=True)
    color = Column(String, default="indigo")
    all_day = Column(Boolean, default=True)
    # Serialized as JSON
    scheduled_email = Column(JSON, nullable=True)
    scheduled_whatsapp = Column(JSON, nullable=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
