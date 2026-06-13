'use server'

import bcrypt from 'bcryptjs'
import { requireOwner } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import type { ActiveStaff, Role } from '@/lib/staff-mode/context'

export type ResolvePinState = { error: string | null; staff?: ActiveStaff }

/**
 * Resolves a 4-digit PIN to an active staff member (FRD §4 "switch to staff
 * mode"). Runs under the owner's auth session: loads the shop's ACTIVE staff
 * and bcrypt-compares the PIN against each. Inactive staff never match, so
 * deactivation immediately revokes PIN access (§7.2). pin_hash stays server-side.
 */
export async function resolveStaffByPinAction(
  _prev: ResolvePinState,
  formData: FormData,
): Promise<ResolvePinState> {
  const { shop } = await requireOwner()
  const pin = String(formData.get('pin') ?? '').trim()
  if (!/^\d{4}$/.test(pin)) return { error: 'Enter your 4-digit PIN.' }

  const supabase = await createClient()
  const { data } = await supabase
    .from('staff')
    .select('id, name, role, pin_hash')
    .eq('shop_id', shop.id)
    .eq('is_active', true)

  for (const s of data ?? []) {
    if (await bcrypt.compare(pin, s.pin_hash)) {
      return {
        error: null,
        staff: { id: s.id, name: s.name, role: s.role as Role },
      }
    }
  }
  return { error: 'No active staff member matches that PIN.' }
}
