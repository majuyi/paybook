import 'server-only'

export type SendResult = { ok: boolean; error?: string }

/**
 * Sends a WhatsApp message via the Business API (Twilio / 360dialog).
 *
 * INTERT UNTIL CONFIGURED: with no provider credentials this returns a failure,
 * so the cron records the attempt and applies the §10.3 retry-once rule without
 * ever delivering. When WHATSAPP_API_TOKEN + WHATSAPP_PHONE_NUMBER_ID are set,
 * wire the real provider call here — the §10.1 template must be registered with
 * the Business API first.
 */
export async function sendWhatsAppMessage(
  _toE164: string,
  _message: string,
): Promise<SendResult> {
  const token = process.env.WHATSAPP_API_TOKEN
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID

  if (!token || !phoneNumberId) {
    return { ok: false, error: 'WhatsApp provider not configured' }
  }

  // TODO (step 8 provider): POST the message to the WhatsApp Business API and
  // return { ok: true } on a 2xx, or { ok: false, error } otherwise.
  return { ok: false, error: 'WhatsApp send not yet implemented' }
}
