'use server'

import { revalidatePath } from 'next/cache'
import bcrypt from 'bcryptjs'
import { createClient } from '@/lib/supabase/server'
import { requireOwner } from '@/lib/auth'
import { normalizeNgPhone } from '@/lib/phone'

export type StaffActionState = { error: string | null; ok?: boolean }

function isValidPin(pin: string) {
  return /^\d{4}$/.test(pin)
}

/** Owner creates a manager/cashier (FRD §7.2). */
export async function createStaffAction(
  _prev: StaffActionState,
  formData: FormData,
): Promise<StaffActionState> {
  await requireOwner()

  const name = String(formData.get('name') ?? '').trim()
  const role = String(formData.get('role') ?? '')
  const pin = String(formData.get('pin') ?? '').trim()
  const phoneRaw = String(formData.get('phone') ?? '').trim()

  if (!name) return { error: 'Name is required.' }
  if (role !== 'manager' && role !== 'cashier') {
    return { error: 'Choose a role (manager or cashier).' }
  }
  if (!isValidPin(pin)) return { error: 'PIN must be exactly 4 digits.' }

  let phone = ''
  if (phoneRaw) {
    const normalized = normalizeNgPhone(phoneRaw)
    if (!normalized) {
      return { error: 'Phone number is not a valid Nigerian number.' }
    }
    phone = normalized
  }

  const pinHash = await bcrypt.hash(pin, 10)
  const supabase = await createClient()
  // Empty phone → the RPC's NULLIF stores NULL.
  const { error } = await supabase.rpc('create_staff', {
    p_name: name,
    p_phone: phone,
    p_role: role,
    p_pin_hash: pinHash,
  })
  if (error) return { error: error.message }

  revalidatePath('/staff')
  return { error: null, ok: true }
}

/** Deactivate (revokes PIN access) or reactivate a staff member (FRD §7.2). */
export async function setStaffActiveAction(formData: FormData) {
  await requireOwner()
  const staffId = String(formData.get('staff_id') ?? '')
  const active = String(formData.get('active') ?? '') === 'true'
  if (!staffId) return

  const supabase = await createClient()
  await supabase.rpc('set_staff_active', {
    p_staff_id: staffId,
    p_active: active,
  })
  revalidatePath('/staff')
}

/** Owner resets a staff member's PIN (FRD §7.2). */
export async function resetPinAction(
  _prev: StaffActionState,
  formData: FormData,
): Promise<StaffActionState> {
  await requireOwner()
  const staffId = String(formData.get('staff_id') ?? '')
  const pin = String(formData.get('pin') ?? '').trim()
  if (!staffId) return { error: 'Missing staff member.' }
  if (!isValidPin(pin)) return { error: 'PIN must be exactly 4 digits.' }

  const pinHash = await bcrypt.hash(pin, 10)
  const supabase = await createClient()
  const { error } = await supabase.rpc('reset_staff_pin', {
    p_staff_id: staffId,
    p_pin_hash: pinHash,
  })
  if (error) return { error: error.message }

  revalidatePath('/staff')
  return { error: null, ok: true }
}
