import { createClient } from '@/lib/supabase/server'
import type { Database } from '@/lib/database.types'

type StaffRow = Database['public']['Tables']['staff']['Row']
export type StaffListItem = Pick<
  StaffRow,
  'id' | 'shop_id' | 'name' | 'phone' | 'role' | 'is_active' | 'created_at'
>

/**
 * All staff for a shop, owner first then by creation. Includes inactive staff
 * (the owner manages them and can reactivate). pin_hash is intentionally not
 * selected — it never needs to reach the client.
 */
export async function listStaff(shopId: string): Promise<StaffListItem[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('staff')
    .select('id, shop_id, name, phone, role, is_active, created_at')
    .eq('shop_id', shopId)
    .order('created_at', { ascending: true })

  const rows = (data ?? []) as StaffListItem[]
  // Owner pinned to the top, then by creation order.
  return rows.sort((a, b) => {
    if (a.role === 'owner' && b.role !== 'owner') return -1
    if (b.role === 'owner' && a.role !== 'owner') return 1
    return 0
  })
}
