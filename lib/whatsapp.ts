/**
 * lib/whatsapp.ts
 * ----------------
 * WhatsApp Business Cloud API wrapper (Meta Graph API v21).
 *
 * Sends a plain text message to a single phone number.
 * Phone numbers must be in E.164 format (e.g. +972501234567).
 *
 * Requires environment variables:
 * - WHATSAPP_PHONE_NUMBER_ID — from Meta Business dashboard
 * - WHATSAPP_ACCESS_TOKEN    — permanent token from Meta for Developers
 *
 * Throws an Error with the HTTP status if the API returns a non-2xx response.
 */

export async function sendWhatsApp(to: string, message: string): Promise<void> {
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const accessToken   = process.env.WHATSAPP_ACCESS_TOKEN;

  if (!phoneNumberId || !accessToken) {
    throw new Error(
      'WhatsApp credentials not configured — set WHATSAPP_PHONE_NUMBER_ID and WHATSAPP_ACCESS_TOKEN',
    );
  }

  const res = await fetch(
    `https://graph.facebook.com/v21.0/${phoneNumberId}/messages`,
    {
      method: 'POST',
      headers: {
        Authorization:  `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        recipient_type:    'individual',
        to,
        type: 'text',
        text: { preview_url: false, body: message },
      }),
    },
  );

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Meta Graph API error ${res.status}: ${body}`);
  }
}
