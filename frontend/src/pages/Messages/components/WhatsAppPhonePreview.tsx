/**
 * Messages/components/WhatsAppPhonePreview.tsx
 * ---------------------------------------------
 * A decorative phone frame that renders a live WhatsApp message preview.
 *
 * Converts WhatsApp markdown syntax to HTML in real-time:
 *   *bold*        → <strong>
 *   _italic_      → <em>
 *   ~strikethrough~ → <del>
 *   ```monospace``` → <code>
 *
 * The preview updates as the user types — it shows exactly how the
 * message will look in WhatsApp.
 */

import { Phone, Send } from 'lucide-react';

interface WhatsAppPhonePreviewProps {
  /** Recipient phone number (displayed in the chat header) */
  to: string;
  /** The message body to render — supports WhatsApp markdown */
  message: string;
}

/**
 * Convert WhatsApp markdown to safe HTML for display.
 *
 * Process order matters:
 * 1. Escape HTML special characters first (prevents XSS)
 * 2. Replace code blocks (``` ```) before inline markers
 * 3. Apply bold, italic, strikethrough
 * 4. Convert newlines to <br>
 */
function renderWhatsAppMarkdown(text: string): string {
  // Step 1 — escape HTML to prevent XSS before injecting dangerouslySetInnerHTML
  let html = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  // Step 2 — code block first (prevents inner text from being processed by other rules)
  html = html.replace(/```([\s\S]*?)```/g, '<code style="font-family:monospace;font-size:12px;background:rgba(0,0,0,0.3);padding:1px 3px;border-radius:3px">$1</code>');

  // Step 3 — inline formatting
  html = html.replace(/\*([^*\n]+)\*/g, '<strong>$1</strong>');
  html = html.replace(/_([^_\n]+)_/g,   '<em>$1</em>');
  html = html.replace(/~([^~\n]+)~/g,   '<del>$1</del>');

  // Step 4 — line breaks
  html = html.replace(/\n/g, '<br />');

  return html;
}

export function WhatsAppPhonePreview({ to, message }: WhatsAppPhonePreviewProps) {
  return (
    <div className="shrink-0 w-[240px] flex flex-col items-center">
      <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest mb-3">Preview</p>

      {/* Phone shell */}
      <div className="w-[240px] bg-[#111] rounded-[32px] border-[3px] border-[#333] shadow-2xl overflow-hidden flex flex-col">

        {/* WhatsApp top bar with recipient name */}
        <div className="bg-[#075e54] px-3 pt-5 pb-2 flex items-center gap-2 shrink-0">
          <div className="w-7 h-7 rounded-full bg-[#acbfc9]/30 flex items-center justify-center shrink-0">
            <Phone size={12} className="text-white" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[12px] font-semibold text-white truncate leading-tight">{to || '+972...'}</p>
            <p className="text-[9px] text-[#acbfc9] leading-tight">online</p>
          </div>
        </div>

        {/* Chat area — rendered message appears as a sent bubble */}
        <div className="bg-[#0d1418] flex-1 p-3 min-h-[280px] max-h-[380px] overflow-y-auto flex flex-col gap-2">
          {message ? (
            <div className="max-w-[90%] ml-auto">
              {/* Green bubble — styled like a sent WhatsApp message */}
              <div className="bg-[#005c4b] rounded-l-2xl rounded-tr-2xl px-3 py-2 shadow">
                <div
                  className="text-[12px] text-white leading-relaxed break-words"
                  dangerouslySetInnerHTML={{ __html: renderWhatsAppMarkdown(message) }}
                />
                {/* Timestamp + double checkmark (decorative) */}
                <p className="text-[9px] text-[#8da8a0] text-right mt-1 leading-tight">
                  {new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })} ✓✓
                </p>
              </div>
            </div>
          ) : (
            <p className="text-slate-600 text-[11px] text-center mt-10 leading-relaxed px-2">
              Start typing to see your message preview...
            </p>
          )}
        </div>

        {/* Input bar at the bottom (decorative mockup) */}
        <div className="bg-[#1f2c33] px-2 py-2 flex items-center gap-2 shrink-0">
          <div className="flex-1 bg-[#2a3942] rounded-full px-3 py-1">
            <p className="text-[10px] text-slate-500">Message</p>
          </div>
          <div className="w-6 h-6 rounded-full bg-[#00a884] flex items-center justify-center shrink-0">
            <Send size={10} className="text-white ml-0.5" />
          </div>
        </div>
      </div>
    </div>
  );
}
