import { createClient } from '@/lib/supabase/server'
import type { Database } from '@/lib/database.types'

type Shop = Database['public']['Tables']['shops']['Row']
type Staff = Database['public']['Tables']['staff']['Row']

export type OwnerContext = {
  userId: string
  shop: Shop | null
  ownerStaff: Staff | null
}

/**
 * Resolves the authenticated owner's shop and their owner-role staff record.
 * Returns shop = null when the owner has not completed onboarding yet.
 * Assumes the caller is already authenticated (enforced by middleware).
 */
export async function getOwnerContext(): Promise<OwnerContext | null> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const { data: shop } = await supabase
    .from('shops')
    .select('*')
    .eq('owner_id', user.id)
    .maybeSingle()

  let ownerStaff: Staff | null = null
  if (shop) {
    const { data } = await supabase
      .from('staff')
      .select('*')
      .eq('shop_id', shop.id)
      .eq('role', 'owner')
      .maybeSingle()
    ownerStaff = data ?? null
  }

  return { userId: user.id, shop: shop ?? null, ownerStaff }
}
