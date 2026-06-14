'use server'

import { revalidatePath } from 'next/cache'
import { resolveActor } from '@/lib/staff-mode/resolve-actor'
import { createClient } from '@/lib/supabase/server'
import type { Role } from '@/lib/staff-mode/context'

export type CreditItem = {
  id: string
  customerName: string
  customerPhone: string | null
  amountOwed: number
  isSettled: boolean
  lastPaymentAt: string | null
  createdAt: string | null
}

export async function getCredits(activeStaffId: string | null): Promise<{
  error: string | null
  role?: Role
  shopName?: string
  credits: CreditItem[]
}> {
  try {
    const actor = await resolveActor(activeStaffId)
    if (actor.role === 'cashier') {
      return { error: 'Credit management is not available to cashiers.', credits: [] }
    }
    const supabase = await createClient()
    const { data: shop } = await supabase
      .from('shops')
      .select('name')
      .eq('id', actor.shopId)
      .single()

    const { data, error } = await supabase
      .from('customer_credits')
      .select('id, customer_name, customer_phone, amount_owed, is_settled, last_payment_at, created_at')
      .eq('shop_id', actor.shopId)
      .order('is_settled', { ascending: true })
      .order('amount_owed', { ascending: false })
    if (error) return { error: error.message, credits: [] }

    const credits: CreditItem[] = (data ?? []).map((c) => ({
      id: c.id,
      customerName: c.customer_name,
      customerPhone: c.customer_phone,
      amountOwed: Number(c.amount_owed),
      isSettled: c.is_settled,
      lastPaymentAt: c.last_payment_at,
      createdAt: c.created_at,
    }))

    return { error: null, role: actor.role, shopName: shop?.name, credits }
  } catch (e) {
    return {
      error: e instanceof Error ? e.message : 'Something went wrong.',
      credits: [],
    }
  }
}

export async function recordPaymentAction(
  activeStaffId: string | null,
  creditId: string,
  amount: number,
): Promise<{ error: string | null }> {
  try {
    const actor = await resolveActor(activeStaffId)
    if (actor.role === 'cashier') {
      return { error: 'You do not have permission to record payments.' }
    }
    if (!(amount > 0)) return { error: 'Enter an amount greater than 0.' }

    const supabase = await createClient()
    const { error } = await supabase.rpc('record_payment', {
      p_actor_id: actor.staffId,
      p_credit_id: creditId,
      p_amount: amount,
    })
    if (error) return { error: error.message }

    revalidatePath('/credit')
    return { error: null }
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Something went wrong.' }
  }
}

export type CreditTxn = {
  id: string
  type: 'charge' | 'payment'
  amount: number
  createdAt: string | null
  recordedByName: string
}

export async function getCreditTransactions(
  activeStaffId: string | null,
  creditId: string,
): Promise<{ error: string | null; transactions: CreditTxn[] }> {
  try {
    const actor = await resolveActor(activeStaffId)
    if (actor.role === 'cashier') {
      return { error: 'Not available.', transactions: [] }
    }
    const supabase = await createClient()

    // Confirm the credit belongs to this shop before listing its ledger.
    const { data: credit } = await supabase
      .from('customer_credits')
      .select('id')
      .eq('id', creditId)
      .eq('shop_id', actor.shopId)
      .maybeSingle()
    if (!credit) return { error: 'Credit not found.', transactions: [] }

    const { data } = await supabase
      .from('credit_transactions')
      .select('id, type, amount, recorded_by, created_at')
      .eq('credit_id', creditId)
      .order('created_at', { ascending: false })

    const { data: staffRows } = await supabase
      .from('staff')
      .select('id, name')
      .eq('shop_id', actor.shopId)
    const nameById = new Map((staffRows ?? []).map((s) => [s.id, s.name]))

    const transactions: CreditTxn[] = (data ?? []).map((t) => ({
      id: t.id,
      type: t.type as 'charge' | 'payment',
      amount: Number(t.amount),
      createdAt: t.created_at,
      recordedByName: (t.recorded_by && nameById.get(t.recorded_by)) || 'Unknown',
    }))

    return { error: null, transactions }
  } catch (e) {
    return {
      error: e instanceof Error ? e.message : 'Something went wrong.',
      transactions: [],
    }
  }
}
