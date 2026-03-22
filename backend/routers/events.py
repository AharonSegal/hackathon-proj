import uuid
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from models.event import Event
from schemas.event import EventCreate, EventUpdate, EventOut

router = APIRouter(prefix="/events", tags=["events"])


def _row_to_out(ev: Event) -> EventOut:
    return EventOut.model_validate(
        {
            "id": ev.id,
            "title": ev.title,
            "description": ev.description,
            "date": ev.date,
            "start_time": ev.start_time,
            "end_time": ev.end_time,
            "color": ev.color,
            "all_day": ev.all_day,
            "scheduled_email": ev.scheduled_email,
            "scheduled_whatsapp": ev.scheduled_whatsapp,
            "created_at": ev.created_at,
            "updated_at": ev.updated_at,
        }
    )


@router.get("/", response_model=list[EventOut])
def list_events(
    year: Optional[int] = None,
    month: Optional[int] = None,
    db: Session = Depends(get_db),
):
    q = db.query(Event)
    if year and month:
        prefix = f"{year:04d}-{month:02d}"
        q = q.filter(Event.date.like(f"{prefix}%"))
    return [_row_to_out(ev) for ev in q.order_by(Event.date).all()]


@router.post("/", response_model=EventOut, status_code=201)
def create_event(body: EventCreate, db: Session = Depends(get_db)):
    ev = Event(
        id=str(uuid.uuid4()),
        title=body.title,
        description=body.description,
        date=body.date,
        start_time=body.start_time,
        end_time=body.end_time,
        color=body.color,
        all_day=body.all_day,
        scheduled_email=body.scheduled_email.model_dump() if body.scheduled_email else None,
        scheduled_whatsapp=body.scheduled_whatsapp.model_dump() if body.scheduled_whatsapp else None,
    )
    db.add(ev)
    db.commit()
    db.refresh(ev)
    return _row_to_out(ev)


@router.put("/{event_id}", response_model=EventOut)
def update_event(event_id: str, body: EventUpdate, db: Session = Depends(get_db)):
    ev = db.query(Event).filter(Event.id == event_id).first()
    if not ev:
        raise HTTPException(404, "Event not found")

    for field, value in body.model_dump(exclude_unset=True).items():
        if field == "scheduled_email" and value is not None:
            setattr(ev, "scheduled_email", value)
        elif field == "scheduled_whatsapp" and value is not None:
            setattr(ev, "scheduled_whatsapp", value)
        else:
            setattr(ev, field, value)

    db.commit()
    db.refresh(ev)
    return _row_to_out(ev)


@router.delete("/{event_id}", status_code=204)
def delete_event(event_id: str, db: Session = Depends(get_db)):
    ev = db.query(Event).filter(Event.id == event_id).first()
    if not ev:
        raise HTTPException(404, "Event not found")
    db.delete(ev)
    db.commit()
