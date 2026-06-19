import { NextResponse, type NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { composeBriefing, normalizeBriefingData } from '@/lib/briefing'
import { sendWhatsAppMessage } from '@/lib/whatsapp-dispatch'

// This route reads request-time data and must never be statically cached.
export const dynamic = 'force-dynamic'

const RETRY_AFTER_MS = 30 * 60 * 1000 // §10.3: retry once after 30 minutes

type Dispatch = {
  status: 'sent' | 'pending_retry' | 'failed'
  attempts: number
  last_attempt_at: string | null
}

/** Local calendar date (YYYY-MM-DD) and minutes-since-midnight in a timezone. */
function nowInTz(tz: string, now: Date): { date: string; minutes: number } {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(now)
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? '00'
  const date = `${get('year')}-${get('month')}-${get('day')}`
  // hour can be "24" at midnight in some environments; normalize to 0.
  const hour = Number(get('hour')) % 24
  return { date, minutes: hour * 60 + Number(get('minute')) }
}

function scheduledMinutes(briefingTime: string): number {
  const [h, m] = briefingTime.split(':')
  return Number(h) * 60 + Number(m)
}

type Action = 'first' | 'retry' | 'skip'

function decideAction(
  existing: Dispatch | null,
  scheduled: number,
  nowMinutes: number,
  nowMs: number,
): Action {
  if (existing) {
    if (existing.status === 'sent' || existing.status === 'failed') return 'skip'
    // pending_retry: retry once, 30 minutes after the first attempt.
    if (existing.status === 'pending_retry') {
      const last = existing.last_attempt_at
        ? Date.parse(existing.last_attempt_at)
        : 0
      return nowMs - last >= RETRY_AFTER_MS ? 'retry' : 'skip'
    }
    return 'skip'
  }
  // No record yet: due once today's scheduled time has passed (the 'sent' record
  // dedupes repeats). On Pro (5-min cron) this fires within ~5 min of the
  // scheduled time; on Hobby (daily cron) it fires on that day's single run.
  const since = nowMinutes - scheduled
  return since >= 0 ? 'first' : 'skip'
}

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET
  if (!secret) {
    return NextResponse.json({ error: 'CRON_SECRET not configured' }, { status: 500 })
  }
  if (request.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const dryRun = request.nextUrl.searchParams.get('dryRun') === '1'
  const admin = createAdminClient()
  const now = new Date()

  // §10.3: only shops with briefing_enabled = true are ever dispatched.
  const { data: shops, error } = await admin
    .from('shops')
    .select('id, name, whatsapp_number, briefing_time, timezone')
    .eq('briefing_enabled', true)
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const results: unknown[] = []

  for (const shop of shops ?? []) {
    const { date, minutes } = nowInTz(shop.timezone, now)

    const { data: rows } = await admin.rpc('briefing_data', {
      p_shop_id: shop.id,
      p_date: date,
    })
    const data = normalizeBriefingData((rows?.[0] ?? {}) as Record<string, unknown>)
    const message = composeBriefing(shop.name, date, data)

    if (dryRun) {
      results.push({ shopId: shop.id, date, message })
      continue
    }

    const { data: existing } = await admin
      .from('briefing_dispatches')
      .select('status, attempts, last_attempt_at')
      .eq('shop_id', shop.id)
      .eq('date', date)
      .maybeSingle()

    const action = decideAction(
      existing as Dispatch | null,
      scheduledMinutes(shop.briefing_time),
      minutes,
      now.getTime(),
    )

    if (action === 'skip') {
      results.push({ shopId: shop.id, date, action })
      continue
    }

    // §10.3: send even if revenue is 0 — no gating on the figures.
    const send = await sendWhatsAppMessage(shop.whatsapp_number, message)
    const attempts = (existing?.attempts ?? 0) + 1
    const status = send.ok
      ? 'sent'
      : attempts >= 2
        ? 'failed'
        : 'pending_retry'

    await admin.from('briefing_dispatches').upsert(
      {
        shop_id: shop.id,
        date,
        status,
        attempts,
        last_attempt_at: new Date().toISOString(),
        sent_at: send.ok ? new Date().toISOString() : null,
        error: send.ok ? null : (send.error ?? 'unknown'),
      },
      { onConflict: 'shop_id,date' },
    )

    results.push({ shopId: shop.id, date, action, sent: send.ok, status })
  }

  return NextResponse.json({ ranAt: now.toISOString(), dryRun, results })
}
