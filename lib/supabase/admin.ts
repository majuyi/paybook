import 'server-only'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/database.types'

/**
 * Service-role Supabase client. BYPASSES RLS — server-only.
 *
 * Per FRD §3, this is the ONLY path allowed to write audit_log (which has no
 * client INSERT policy), and it backs other privileged server actions. The
 * `server-only` import makes the build fail if this is ever pulled into a
 * client component, so the service_role key can never ship to the browser.
 */
export function createAdminClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  )
}
