'use server'

import { revalidatePath } from 'next/cache'
import { resolveActor } from '@/lib/staff-mode/resolve-actor'
import { createClient } from '@/lib/supabase/server'
import type { Role } from '@/lib/staff-mode/context'

export type ReconRow = {
  cashierId: string
  cashierName: string
  salesCount: number
  cashTotal: number
  transferTotal: number
  posTotal: number
  creditTotal: number
  expected: number
  actual: number | null
  discrepancy: number | null
  completed: boolean
  completedByName: string | null
  flagged: boolean
}

function todayInTz(tz: string): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date())
}

export async function getReconciliation(
  activeStaffId: string | null,
  dateStr: string | null,
): Promise<{
  error: string | null
  role?: Role
  date?: string
  tolerance?: number
  rows: ReconRow[]
}> {
  try {
    const actor = await resolveActor(activeStaffId)
    if (actor.role === 'cashier') {
      return { error: 'Reconciliation is not available to cashiers.', rows: [] }
    }

    const supabase = await createClient()
    const { data: shop } = await supabase
      .from('shops')
      .select('recon_tolerance, timezone')
      .eq('id', actor.shopId)
      .single()

    const tolerance = Number(shop?.recon_tolerance ?? 50)
    const tz = shop?.timezone ?? 'Africa/Lagos'
    const date = dateStr || todayInTz(tz)

    const { data, error } = await supabase.rpc('reconciliation_overview', {
      p_date: date,
    })
    if (error) return { error: error.message, rows: [] }

    const rows: ReconRow[] = (data ?? []).map((r) => {
      const completed = r.recon_completed_at != null
      const expected = completed
        ? Number(r.recon_expected)
        : Number(r.cash_total)
      const actual = r.recon_actual != null ? Number(r.recon_actual) : null
      const discrepancy =
        r.recon_discrepancy != null ? Number(r.recon_discrepancy) : null
      return {
        cashierId: r.cashier_id,
        cashierName: r.cashier_name,
        salesCount: Number(r.sales_count),
        cashTotal: Number(r.cash_total),
        transferTotal: Number(r.transfer_total),
        posTotal: Number(r.pos_total),
        creditTotal: Number(r.credit_total),
        expected,
        actual,
        discrepancy,
        completed,
        completedByName: r.completed_by_name,
        flagged:
          completed && discrepancy != null && Math.abs(discrepancy) > tolerance,
      }
    })

    return { error: null, role: actor.role, date, tolerance, rows }
  } catch (e) {
    return {
      error: e instanceof Error ? e.message : 'Something went wrong.',
      rows: [],
    }
  }
}

export async function completeReconciliationAction(
  activeStaffId: string | null,
  cashierId: string,
  dateStr: string,
  actualCash: number,
): Promise<{ error: string | null }> {
  try {
    const actor = await resolveActor(activeStaffId)
    if (actor.role === 'cashier') {
      return { error: 'You do not have permission to reconcile.' }
    }
    if (!(actualCash >= 0)) return { error: 'Enter the cash counted (0 or more).' }

    const supabase = await createClient()
    const { error } = await supabase.rpc('complete_reconciliation', {
      p_actor_id: actor.staffId,
      p_cashier_id: cashierId,
      p_date: dateStr,
      p_actual_cash: actualCash,
    })
    if (error) return { error: error.message }

    revalidatePath('/reconciliation')
    return { error: null }
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Something went wrong.' }
  }
}
