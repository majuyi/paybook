'use server'

import { revalidatePath } from 'next/cache'
import { resolveActor } from '@/lib/staff-mode/resolve-actor'
import { createClient } from '@/lib/supabase/server'
import { normalizeNgPhone } from '@/lib/phone'

export type SettingsInput = {
  name: string
  whatsappNumber: string
  briefingTime: string // "HH:MM"
  briefingEnabled: boolean
  reconTolerance: number
}

/** Owner-only shop settings update (FRD §12). All fields map to the shops table. */
export async function updateSettingsAction(
  activeStaffId: string | null,
  input: SettingsInput,
): Promise<{ error: string | null; ok?: boolean }> {
  try {
    const actor = await resolveActor(activeStaffId)
    if (actor.role !== 'owner') {
      return { error: 'Only the owner can change settings.' }
    }

    const name = input.name.trim()
    if (!name) return { error: 'Shop name is required.' }

    const phone = normalizeNgPhone(input.whatsappNumber)
    if (!phone) {
      return { error: 'Enter a valid Nigerian WhatsApp number, e.g. 0803 123 4567.' }
    }

    if (!/^\d{2}:\d{2}$/.test(input.briefingTime)) {
      return { error: 'Enter a valid briefing time.' }
    }
    if (!(input.reconTolerance >= 0)) {
      return { error: 'Reconciliation tolerance must be 0 or more.' }
    }

    const supabase = await createClient()
    const { error } = await supabase
      .from('shops')
      .update({
        name,
        whatsapp_number: phone,
        briefing_time: input.briefingTime,
        briefing_enabled: input.briefingEnabled,
        recon_tolerance: input.reconTolerance,
      })
      .eq('id', actor.shopId)
    if (error) return { error: error.message }

    revalidatePath('/settings')
    revalidatePath('/', 'layout') // shop name shows in the nav
    return { error: null, ok: true }
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Something went wrong.' }
  }
}
