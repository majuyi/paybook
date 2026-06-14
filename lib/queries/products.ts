import { createClient } from '@/lib/supabase/server'
import type { Database } from '@/lib/database.types'

type ProductRow = Database['public']['Tables']['products']['Row']

/**
 * Inventory list shape. cost_price is intentionally excluded — it is profit
 * data (FRD §7.1, owner only) and must never reach a non-owner client, so it's
 * never in the broadly-fetched list. The owner edit form loads it on demand
 * through an owner-validated server action.
 */
export type ProductListItem = Pick<
  ProductRow,
  | 'id'
  | 'name'
  | 'category'
  | 'sell_price'
  | 'stock_qty'
  | 'low_stock_threshold'
  | 'is_active'
>

export type SellableProduct = Pick<
  ProductRow,
  'id' | 'name' | 'category' | 'sell_price' | 'stock_qty'
>

/**
 * Products that can be added to a sale: active and in stock only. A product at
 * stock_qty = 0 is not sellable (§5.2), and inactive products never appear in
 * the picker (§6.2). cost_price is excluded (not needed to sell).
 */
export async function listSellableProducts(
  shopId: string,
): Promise<SellableProduct[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('products')
    .select('id, name, category, sell_price, stock_qty')
    .eq('shop_id', shopId)
    .eq('is_active', true)
    .gt('stock_qty', 0)
    .order('name', { ascending: true })

  return (data ?? []) as SellableProduct[]
}

export async function listProducts(shopId: string): Promise<ProductListItem[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('products')
    .select('id, name, category, sell_price, stock_qty, low_stock_threshold, is_active')
    .eq('shop_id', shopId)
    .order('is_active', { ascending: false })
    .order('name', { ascending: true })

  return (data ?? []) as ProductListItem[]
}
