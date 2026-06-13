'use client'

import Link from 'next/link'
import { useStaffMode, type Role } from './context'

/**
 * Client-side view gate. With the in-memory staff-mode model the server can't
 * know the effective role on navigation, so owner/manager-only screens wrap
 * their content here. Mutations are additionally validated server-side.
 */
export function RoleGuard({
  allow,
  children,
}: {
  allow: Role[]
  children: React.ReactNode
}) {
  const { role } = useStaffMode()

  if (!allow.includes(role)) {
    return (
      <div className="rounded-xl border border-neutral-200 bg-white p-6 text-center">
        <p className="text-sm font-medium text-neutral-900">
          Not available in staff mode
        </p>
        <p className="mt-1 text-sm text-neutral-500">
          This section is for the shop owner. Switch back to owner to continue.
        </p>
        <Link
          href="/"
          className="mt-4 inline-block text-sm text-neutral-700 underline"
        >
          Go to dashboard
        </Link>
      </div>
    )
  }

  return <>{children}</>
}
