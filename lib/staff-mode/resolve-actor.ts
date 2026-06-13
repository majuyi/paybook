import { requireOwner } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import type { Role } from '@/lib/staff-mode/context'

export type Actor = { staffId: string; role: Role; shopId: string }

/**
 * Server-side resolution of the effective actor for a privileged action.
 * `activeStaffId` is the client's in-memory staff-mode id (or null = owner).
 * We re-validate it against the shop's ACTIVE staff and derive the role from
 * the database — the client cannot claim a role it doesn't have, and a staff
 * member deactivated mid-session is rejected. This is the trusted counterpart
 * to the in-memory client context (FRD §4: enforce in server actions).
 */
export async function resolveActor(activeStaffId: string | null): Promise<Actor> {
  const ctx = await requireOwner()
  const shopId = ctx.shop.id

  if (!activeStaffId) {
    if (!ctx.ownerStaff) throw new Error('Owner staff record is missing.')
    return { staffId: ctx.ownerStaff.id, role: 'owner', shopId }
  }

  const supabase = await createClient()
  const { data } = await supabase
    .from('staff')
    .select('id, role')
    .eq('id', activeStaffId)
    .eq('shop_id', shopId)
    .eq('is_active', true)
    .maybeSingle()

  if (!data) throw new Error('Your staff session is no longer active.')
  return { staffId: data.id, role: data.role as Role, shopId }
}
