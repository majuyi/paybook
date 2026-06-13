import { createBrowserClient } from '@supabase/ssr'
import type { Database } from '@/lib/database.types'

/**
 * Browser-side Supabase client (anon key). Used in client components for
 * the owner's phone-OTP auth flow. RLS applies to every query made here.
 */
export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )
}
