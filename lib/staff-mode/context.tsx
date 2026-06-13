'use client'

import { createContext, useCallback, useContext, useMemo, useState } from 'react'

export type Role = 'owner' | 'manager' | 'cashier'
export type ActiveStaff = { id: string; name: string; role: Role }

type StaffModeValue = {
  /** The staff member currently "switched in", or null = acting as owner. */
  active: ActiveStaff | null
  /** Effective role driving UI/action gating. Defaults to owner. */
  role: Role
  enter: (staff: ActiveStaff) => void
  exit: () => void
}

const StaffModeContext = createContext<StaffModeValue | null>(null)

/**
 * Holds the active-staff identity in memory ONLY. It is never persisted to a
 * cookie or storage, so a page refresh resets to the owner view — per FRD §4
 * ("staff session is scoped to the browser session only"). Privileged server
 * actions re-validate the staff_id against the shop's active staff; this
 * context is purely the client-side overlay.
 */
export function StaffModeProvider({ children }: { children: React.ReactNode }) {
  const [active, setActive] = useState<ActiveStaff | null>(null)

  const enter = useCallback((staff: ActiveStaff) => setActive(staff), [])
  const exit = useCallback(() => setActive(null), [])

  const value = useMemo<StaffModeValue>(
    () => ({ active, role: active?.role ?? 'owner', enter, exit }),
    [active, enter, exit],
  )

  return (
    <StaffModeContext.Provider value={value}>
      {children}
    </StaffModeContext.Provider>
  )
}

export function useStaffMode(): StaffModeValue {
  const ctx = useContext(StaffModeContext)
  if (!ctx) throw new Error('useStaffMode must be used within StaffModeProvider')
  return ctx
}
