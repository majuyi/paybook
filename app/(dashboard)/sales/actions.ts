'use server'

import { revalidatePath } from 'next/cache'
import { resolveActor } from '@/lib/staff-mode/resolve-actor'
import { createClient } from '@/lib/supabase/server'
import { normalizeNgPhone } from '@/lib/phone'
import type { Role } from '@/lib/staff-mode/context'

export type PaymentMethod = 'cash' | 'transfer' | 'pos' | 'credit'

export type NewSalePayload = {
  paymentMethod: PaymentMethod
  items: { productId: string; quantity: number }[]
  customerName?: string
  customerPhone?: string
}

/** Log a sale (any role). Atomic stock decrement + denormalised items + audit. */
export async function createSaleAction(
  activeStaffId: string | null,
  payload: NewSalePayload,
): Promise<{ error: string | null; saleId?: string }> {
  try {
    const actor = await resolveActor(activeStaffId) // any role may sell (§7.1)
    if (!payload.items.length) return { error: 'Add at least one product.' }

    let phone: string | null = null
    if (payload.paymentMethod === 'credit') {
      if (!payload.customerName?.trim()) {
        return { error: 'Customer name is required for a credit sale.' }
      }
      if (payload.customerPhone?.trim()) {
        phone = normalizeNgPhone(payload.customerPhone)
        if (!phone) return { error: 'Customer phone is not a valid Nigerian number.' }
      }
    }

    const supabase = await createClient()
    const { data, error } = await supabase.rpc('create_sale', {
      p_actor_id: actor.staffId,
      p_payment_method: payload.paymentMethod,
      p_items: payload.items,
      p_customer_name: (payload.customerName ?? '') as string,
      p_customer_phone: (phone ?? '') as string,
      p_note: '' as string,
    })
    if (error) return { error: error.message }

    revalidatePath('/sales')
    revalidatePath('/inventory')
    return { error: null, saleId: data as string }
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Something went wrong.' }
  }
}

/** Owner-only soft delete with a required reason (§5.3). */
export async function softDeleteSaleAction(
  activeStaffId: string | null,
  saleId: string,
  reason: string,
): Promise<{ error: string | null }> {
  try {
    const actor = await resolveActor(activeStaffId)
    if (actor.role !== 'owner') {
      return { error: 'Only the owner can delete a sale.' }
    }
    if (!reason.trim()) return { error: 'A reason is required.' }

    const supabase = await createClient()
    const { error } = await supabase.rpc('soft_delete_sale', {
      p_actor_id: actor.staffId,
      p_sale_id: saleId,
      p_reason: reason,
    })
    if (error) return { error: error.message }

    revalidatePath('/sales')
    return { error: null }
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Something went wrong.' }
  }
}

export type SaleListItem = {
  id: string
  total: number
  paymentMethod: PaymentMethod
  soldAt: string
  isDeleted: boolean
  cashierName: string
  items: { name: string; quantity: number; sellPrice: number }[]
  deletedReason?: string
}

/**
 * Role-filtered sales history (§7.1):
 *   cashier → own, non-deleted   manager → all, non-deleted   owner → all incl deleted.
 * Resolved server-side from the active staff id so a cashier can't see others'
 * sales and only the owner sees soft-deleted rows (with their reason).
 */
export async function getSales(
  activeStaffId: string | null,
): Promise<{ error: string | null; role?: Role; sales: SaleListItem[] }> {
  try {
    const actor = await resolveActor(activeStaffId)
    const supabase = await createClient()

    let query = supabase
      .from('sales')
      .select(
        'id, total, payment_method, sold_at, is_deleted, cashier_id, sale_items(product_name, quantity, sell_price)',
      )
      .eq('shop_id', actor.shopId)
      .order('sold_at', { ascending: false })
      .limit(100)

    if (actor.role === 'cashier') {
      query = query.eq('cashier_id', actor.staffId).eq('is_deleted', false)
    } else if (actor.role === 'manager') {
      query = query.eq('is_deleted', false)
    } // owner: all, including deleted

    const { data, error } = await query
    if (error) return { error: error.message, sales: [] }

    // Map cashier ids to names (avoids ambiguous multi-FK embed on staff).
    const { data: staffRows } = await supabase
      .from('staff')
      .select('id, name')
      .eq('shop_id', actor.shopId)
    const nameById = new Map((staffRows ?? []).map((s) => [s.id, s.name]))

    // Owner: load deletion reasons from the audit log.
    const reasonBySale = new Map<string, string>()
    if (actor.role === 'owner') {
      const deletedIds = (data ?? []).filter((s) => s.is_deleted).map((s) => s.id)
      if (deletedIds.length) {
        const { data: audits } = await supabase
          .from('audit_log')
          .select('entity_id, payload')
          .eq('shop_id', actor.shopId)
          .eq('action', 'sale.deleted')
          .in('entity_id', deletedIds)
        for (const a of audits ?? []) {
          const reason = (a.payload as { reason?: string } | null)?.reason
          if (reason) reasonBySale.set(a.entity_id, reason)
        }
      }
    }

    const sales: SaleListItem[] = (data ?? []).map((s) => ({
      id: s.id,
      total: s.total,
      paymentMethod: s.payment_method as PaymentMethod,
      soldAt: s.sold_at,
      isDeleted: s.is_deleted,
      cashierName: (s.cashier_id && nameById.get(s.cashier_id)) || 'Unknown',
      items: (s.sale_items ?? []).map((i) => ({
        name: i.product_name,
        quantity: i.quantity,
        sellPrice: i.sell_price,
      })),
      deletedReason: reasonBySale.get(s.id),
    }))

    return { error: null, role: actor.role, sales }
  } catch (e) {
    return {
      error: e instanceof Error ? e.message : 'Something went wrong.',
      sales: [],
    }
  }
}
