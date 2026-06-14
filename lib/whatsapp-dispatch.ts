import 'server-only'

export type SendResult = { ok: boolean; error?: string }

/**
 * Sends a WhatsApp message via Twilio's Messages API.
 *
 * Configuration (server-only env):
 *   TWILIO_ACCOUNT_SID    — Twilio account SID
 *   TWILIO_AUTH_TOKEN     — Twilio auth token
 *   TWILIO_WHATSAPP_FROM  — the WhatsApp sender, e.g. "whatsapp:+14155238886"
 *                           (the "whatsapp:" prefix is added if missing)
 * With any of these unset, this returns a failure so the briefing cron records
 * the attempt and applies the §10.3 retry-once rule without delivering.
 *
 * IMPORTANT — templates vs. freeform: the daily briefing is BUSINESS-INITIATED,
 * so in production it must use a WhatsApp template approved with Meta. Freeform
 * `Body` only delivers inside a 24-hour user-initiated session (and to numbers
 * joined to the Twilio WhatsApp **sandbox**, which is how you test this). For
 * production, register the §10.1 briefing as a Twilio Content template and send
 * `ContentSid` + `ContentVariables` instead of `Body`; outside a session a
 * freeform send fails with Twilio error 63016.
 */
export async function sendWhatsAppMessage(
  toE164: string,
  message: string,
): Promise<SendResult> {
  const accountSid = process.env.TWILIO_ACCOUNT_SID
  const authToken = process.env.TWILIO_AUTH_TOKEN
  const from = process.env.TWILIO_WHATSAPP_FROM

  if (!accountSid || !authToken || !from) {
    return { ok: false, error: 'WhatsApp provider not configured' }
  }

  const fromAddr = from.startsWith('whatsapp:') ? from : `whatsapp:${from}`
  const body = new URLSearchParams({
    From: fromAddr,
    To: `whatsapp:${toE164}`,
    Body: message,
  })

  try {
    const res = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
      {
        method: 'POST',
        headers: {
          Authorization:
            'Basic ' +
            Buffer.from(`${accountSid}:${authToken}`).toString('base64'),
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: body.toString(),
      },
    )

    if (!res.ok) {
      let detail = `HTTP ${res.status}`
      try {
        const j = (await res.json()) as { code?: number; message?: string }
        if (j?.message) detail = `${j.code ?? res.status}: ${j.message}`
      } catch {
        // non-JSON error body — keep the HTTP status
      }
      return { ok: false, error: detail }
    }

    return { ok: true }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'send failed' }
  }
}
