"""
WhatsApp Business Cloud API (Meta Graph API v21)
Docs: https://developers.facebook.com/docs/whatsapp/cloud-api/messages
"""
import httpx
from database import settings

GRAPH_API_URL = "https://graph.facebook.com/v21.0"


async def send_whatsapp_message(to: str, message: str) -> dict:
    """Send a plain-text WhatsApp message via the Cloud API."""
    phone_number_id = settings.whatsapp_phone_number_id
    access_token = settings.whatsapp_access_token

    if not phone_number_id or not access_token:
        raise ValueError("WhatsApp credentials not configured in settings")

    url = f"{GRAPH_API_URL}/{phone_number_id}/messages"
    headers = {
        "Authorization": f"Bearer {access_token}",
        "Content-Type": "application/json",
    }
    payload = {
        "messaging_product": "whatsapp",
        "recipient_type": "individual",
        "to": to,
        "type": "text",
        "text": {"preview_url": False, "body": message},
    }

    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.post(url, headers=headers, json=payload)
        resp.raise_for_status()
        return resp.json()


async def send_whatsapp_template(
    to: str,
    template_name: str,
    language_code: str = "he",
    components: list | None = None,
) -> dict:
    """Send a WhatsApp template message."""
    phone_number_id = settings.whatsapp_phone_number_id
    access_token = settings.whatsapp_access_token

    url = f"{GRAPH_API_URL}/{phone_number_id}/messages"
    headers = {
        "Authorization": f"Bearer {access_token}",
        "Content-Type": "application/json",
    }
    payload = {
        "messaging_product": "whatsapp",
        "to": to,
        "type": "template",
        "template": {
            "name": template_name,
            "language": {"code": language_code},
            **({"components": components} if components else {}),
        },
    }

    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.post(url, headers=headers, json=payload)
        resp.raise_for_status()
        return resp.json()
