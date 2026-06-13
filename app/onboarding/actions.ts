'use server'

import { redirect } from 'next/navigation'
import bcrypt from 'bcryptjs'
import { createClient } from '@/lib/supabase/server'
import { normalizeNgPhone } from '@/lib/phone'

export type OnboardingState = { error: string | null }

/**
 * Creates the shop + owner staff record on first login (FRD §4).
 * The 4-digit owner PIN is bcrypt-hashed here and never stored or logged in
 * plaintext; the atomic write happens in the create_shop_with_owner RPC.
 */
export async function createShopAction(
  _prev: OnboardingState,
  formData: FormData,
): Promise<OnboardingState> {
  const shopName = String(formData.get('shop_name') ?? '').trim()
  const ownerName = String(formData.get('owner_name') ?? '').trim()
  const whatsappRaw = String(formData.get('whatsapp_number') ?? '').trim()
  const pin = String(formData.get('pin') ?? '').trim()

  if (!shopName) return { error: 'Shop name is required.' }
  if (!ownerName) return { error: 'Your name is required.' }

  const whatsapp = normalizeNgPhone(whatsappRaw)
  if (!whatsapp) {
    return { error: 'Enter a valid Nigerian WhatsApp number, e.g. 0803 123 4567.' }
  }

  if (!/^\d{4}$/.test(pin)) {
    return { error: 'PIN must be exactly 4 digits.' }
  }

  const pinHash = await bcrypt.hash(pin, 10)

  const supabase = await createClient()
  const { error } = await supabase.rpc('create_shop_with_owner', {
    p_name: shopName,
    p_whatsapp: whatsapp,
    p_owner_name: ownerName,
    p_pin_hash: pinHash,
  })

  if (error) {
    return { error: error.message }
  }

  redirect('/')
}
