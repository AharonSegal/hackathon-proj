from fastapi import APIRouter
from pydantic import BaseModel
from typing import Any

router = APIRouter(prefix="/settings", tags=["settings"])


class SettingsPayload(BaseModel):
    data: Any


@router.post("/")
def save_settings(body: dict):
    """
    Frontend settings are stored in localStorage.
    This endpoint is a hook for future server-side persistence
    (e.g. write to a JSON file or environment variables).
    """
    return {"ok": True}
