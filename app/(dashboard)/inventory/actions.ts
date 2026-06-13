'use server'

import { revalidatePath } from 'next/cache'
import { resolveActor } from '@/lib/staff-mode/resolve-actor'
import { createClient } from '@/lib/supabase/server'

export type ActionResult = { error: string | null }

export type ProductInput = {
  name: string
  category: string
  sellPrice: number
  costPrice: number | null
  stockQty: number
  lowStockThreshold: number
}

export type ProductEditInput = {
  name: string
  category: string
  sellPrice: number
  costPrice: number | null
  lowStockThreshold: number
}

const CAN_MANAGE = ['owner', 'manager'] as const

/** Owner/manager add a product. cost_price is owner-only (FRD §7.1). */
export async function createProduct(
  activeStaffId: string | null,
  input: ProductInput,
): Promise<ActionResult> {
  try {
    const actor = await resolveActor(activeStaffId)
    if (!CAN_MANAGE.includes(actor.role as 'owner' | 'manager')) {
      return { error: 'You do not have permission to add products.' }
    }
    if (!input.name.trim()) return { error: 'Name is required.' }
    if (!(input.sellPrice >= 0)) return { error: 'Sell price must be 0 or more.' }

    const cost = actor.role === 'owner' ? input.costPrice : null
    const supabase = await createClient()
    const { error } = await supabase.rpc('create_product', {
      p_actor_id: actor.staffId,
      p_name: input.name,
      p_category: input.category,
      p_sell_price: input.sellPrice,
      // Column is nullable despite the generated non-null type.
      p_cost_price: (cost ?? null) as number,
      p_stock_qty: input.stockQty,
      p_low_stock_threshold: input.lowStockThreshold,
    })
    if (error) return { error: error.message }
    revalidatePath('/inventory')
    return { error: null }
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Something went wrong.' }
  }
}

/** Owner/manager edit a product. Managers cannot change cost_price (§7.1). */
export async function updateProduct(
  activeStaffId: string | null,
  productId: string,
  input: ProductEditInput,
): Promise<ActionResult> {
  try {
    const actor = await resolveActor(activeStaffId)
    if (!CAN_MANAGE.includes(actor.role as 'owner' | 'manager')) {
      return { error: 'You do not have permission to edit products.' }
    }
    if (!input.name.trim()) return { error: 'Name is required.' }
    if (!(input.sellPrice >= 0)) return { error: 'Sell price must be 0 or more.' }

    const applyCost = actor.role === 'owner'
    const supabase = await createClient()
    const { error } = await supabase.rpc('update_product', {
      p_actor_id: actor.staffId,
      p_product_id: productId,
      p_name: input.name,
      p_category: input.category,
      p_sell_price: input.sellPrice,
      p_low_stock_threshold: input.lowStockThreshold,
      p_cost_price: (input.costPrice ?? null) as number,
      p_apply_cost: applyCost,
    })
    if (error) return { error: error.message }
    revalidatePath('/inventory')
    return { error: null }
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Something went wrong.' }
  }
}

/** Deactivate/reactivate a product — no hard delete (§6.2). */
export async function setProductActive(
  activeStaffId: string | null,
  productId: string,
  active: boolean,
): Promise<ActionResult> {
  try {
    const actor = await resolveActor(activeStaffId)
    if (!CAN_MANAGE.includes(actor.role as 'owner' | 'manager')) {
      return { error: 'You do not have permission to change products.' }
    }
    const supabase = await createClient()
    const { error } = await supabase.rpc('set_product_active', {
      p_actor_id: actor.staffId,
      p_product_id: productId,
      p_active: active,
    })
    if (error) return { error: error.message }
    revalidatePath('/inventory')
    return { error: null }
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Something went wrong.' }
  }
}

/** Manual stock adjustment with required reason; audits before/after (§6.2). */
export async function adjustStock(
  activeStaffId: string | null,
  productId: string,
  newQty: number,
  reason: string,
): Promise<ActionResult> {
  try {
    const actor = await resolveActor(activeStaffId)
    if (!CAN_MANAGE.includes(actor.role as 'owner' | 'manager')) {
      return { error: 'You do not have permission to adjust stock.' }
    }
    if (!Number.isInteger(newQty) || newQty < 0) {
      return { error: 'Enter a whole number of 0 or more.' }
    }
    if (!reason.trim()) return { error: 'A reason is required.' }

    const supabase = await createClient()
    const { error } = await supabase.rpc('adjust_stock', {
      p_actor_id: actor.staffId,
      p_product_id: productId,
      p_new_qty: newQty,
      p_reason: reason,
    })
    if (error) return { error: error.message }
    revalidatePath('/inventory')
    return { error: null }
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Something went wrong.' }
  }
}

export type ProductForEdit = {
  id: string
  name: string
  category: string
  sellPrice: number
  lowStockThreshold: number
  costPrice: number | null
  canEditCost: boolean
}

/** Loads a product for editing. cost_price is returned only to the owner. */
export async function getProductForEdit(
  activeStaffId: string | null,
  productId: string,
): Promise<{ error: string | null; product?: ProductForEdit }> {
  try {
    const actor = await resolveActor(activeStaffId)
    if (!CAN_MANAGE.includes(actor.role as 'owner' | 'manager')) {
      return { error: 'You do not have permission to edit products.' }
    }
    const isOwner = actor.role === 'owner'
    const supabase = await createClient()
    const { data } = await supabase
      .from('products')
      .select('id, name, category, sell_price, low_stock_threshold, cost_price')
      .eq('id', productId)
      .eq('shop_id', actor.shopId)
      .maybeSingle()
    if (!data) return { error: 'Product not found.' }

    return {
      error: null,
      product: {
        id: data.id,
        name: data.name,
        category: data.category ?? '',
        sellPrice: data.sell_price,
        lowStockThreshold: data.low_stock_threshold,
        costPrice: isOwner ? data.cost_price : null,
        canEditCost: isOwner,
      },
    }
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Something went wrong.' }
  }
}

/** Bulk add several products in one session (§6.2 SHOULD). Best-effort per row. */
export async function bulkCreateProducts(
  activeStaffId: string | null,
  rows: ProductInput[],
): Promise<{ error: string | null; created: number }> {
  try {
    const actor = await resolveActor(activeStaffId)
    if (!CAN_MANAGE.includes(actor.role as 'owner' | 'manager')) {
      return { error: 'You do not have permission to add products.', created: 0 }
    }
    const supabase = await createClient()
    let created = 0
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i]
      if (!r.name.trim()) continue
      const cost = actor.role === 'owner' ? r.costPrice : null
      const { error } = await supabase.rpc('create_product', {
        p_actor_id: actor.staffId,
        p_name: r.name,
        p_category: r.category,
        p_sell_price: r.sellPrice,
        p_cost_price: (cost ?? null) as number,
        p_stock_qty: r.stockQty,
        p_low_stock_threshold: r.lowStockThreshold,
      })
      if (error) {
        revalidatePath('/inventory')
        return { error: `Row ${i + 1} (${r.name}): ${error.message}`, created }
      }
      created++
    }
    revalidatePath('/inventory')
    return { error: null, created }
  } catch (e) {
    return {
      error: e instanceof Error ? e.message : 'Something went wrong.',
      created: 0,
    }
  }
}
