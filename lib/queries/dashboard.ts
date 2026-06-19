import { createClient } from '@/lib/supabase/server'
import { normalizeBriefingData, type BriefingData } from '@/lib/briefing'

/**
 * Today's six §10 figures for the authenticated owner's shop, live. Backed by
 * the dashboard_summary() RPC, which derives the shop + today's date (in the
 * shop's timezone) from auth.uid() — no shop_id is ever passed from the client.
 * Returns null if the figures can't be loaded (the page degrades to quick links).
 */
export async function getDashboardSummary(): Promise<BriefingData | null> {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('dashboard_summary')
  if (error || !data || data.length === 0) return null
  return normalizeBriefingData(data[0] as unknown as Record<string, unknown>)
}
