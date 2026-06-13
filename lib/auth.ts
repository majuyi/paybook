import { redirect } from 'next/navigation'
import { getOwnerContext, type OwnerContext } from '@/lib/queries/shop'
import type { Database } from '@/lib/database.types'

type Shop = Database['public']['Tables']['shops']['Row']

export type OwnerSession = OwnerContext & { shop: Shop }

/**
 * Gate for owner-only server components. Redirects unauthenticated users to
 * /login and not-yet-onboarded owners to /onboarding. Returns a context whose
 * shop is guaranteed non-null.
 *
 * NOTE (FRD §4): on web everything runs under the owner's auth session, so
 * "owner" here means the authenticated account. Staff-mode (PIN switch) layers
 * on top of this later; role restrictions beyond owner are enforced per-action.
 */
export async function requireOwner(): Promise<OwnerSession> {
  const ctx = await getOwnerContext()
  if (!ctx) redirect('/login')
  if (!ctx.shop) redirect('/onboarding')
  return ctx as OwnerSession
}
