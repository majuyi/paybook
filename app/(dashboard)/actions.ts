'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

/** Clears the Supabase Auth session (FRD §12 — Log out). */
export async function logoutAction() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/login')
}
