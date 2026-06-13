'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useStaffMode } from '@/lib/staff-mode/context'
import { logoutAction } from './actions'
import { resolveStaffByPinAction } from './staff-mode-actions'

const roleLabel: Record<string, string> = {
  owner: 'Owner',
  manager: 'Manager',
  cashier: 'Cashier',
}

export function TopNav({ shopName }: { shopName: string }) {
  const { active, role, exit } = useStaffMode()

  return (
    <header className="border-b border-neutral-200 bg-white">
      <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-between gap-2 px-4 py-3">
        <div className="flex items-center gap-6">
          <Link href="/" className="text-sm font-semibold text-neutral-900">
            {shopName}
          </Link>
          <nav className="flex items-center gap-4 text-sm">
            <Link href="/" className="text-neutral-600 hover:text-neutral-900">
              Dashboard
            </Link>
            <Link
              href="/inventory"
              className="text-neutral-600 hover:text-neutral-900"
            >
              Inventory
            </Link>
            {role === 'owner' && (
              <Link
                href="/staff"
                className="text-neutral-600 hover:text-neutral-900"
              >
                Staff
              </Link>
            )}
          </nav>
        </div>

        <div className="flex items-center gap-3">
          {active ? (
            <>
              <span className="text-xs text-neutral-500">
                Acting as{' '}
                <span className="font-medium text-neutral-800">
                  {active.name}
                </span>{' '}
                · {roleLabel[active.role] ?? active.role}
              </span>
              <button
                type="button"
                onClick={exit}
                className="text-sm text-neutral-600 hover:text-neutral-900"
              >
                Switch to owner
              </button>
            </>
          ) : (
            <StaffModeSwitcher />
          )}
          {role === 'owner' && (
            <form action={logoutAction}>
              <button
                type="submit"
                className="text-sm text-neutral-500 hover:text-neutral-900"
              >
                Log out
              </button>
            </form>
          )}
        </div>
      </div>
    </header>
  )
}

function StaffModeSwitcher() {
  const { enter } = useStaffMode()
  const [open, setOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setPending(true)
    setError(null)
    const formData = new FormData(e.currentTarget)
    const result = await resolveStaffByPinAction({ error: null }, formData)
    setPending(false)
    if (result.staff) {
      enter(result.staff) // in-memory switch; lost on refresh (§4)
      setOpen(false)
    } else {
      setError(result.error)
    }
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="rounded-lg border border-neutral-300 px-3 py-1.5 text-sm text-neutral-700 hover:bg-neutral-50"
      >
        Switch to staff mode
      </button>
      {open && (
        <div className="absolute right-0 z-10 mt-2 w-64 rounded-xl border border-neutral-200 bg-white p-4 shadow-lg">
          <p className="text-sm font-medium text-neutral-900">Staff PIN</p>
          <p className="mt-0.5 text-xs text-neutral-500">
            Enter your 4-digit PIN to switch in.
          </p>
          <form onSubmit={onSubmit} className="mt-3 space-y-2">
            <input
              name="pin"
              type="password"
              inputMode="numeric"
              maxLength={4}
              required
              autoFocus
              placeholder="••••"
              className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm tracking-[0.4em] outline-none focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900"
            />
            {error && <p className="text-xs text-red-600">{error}</p>}
            <button
              type="submit"
              disabled={pending}
              className="w-full rounded-lg bg-neutral-900 py-2 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-50"
            >
              {pending ? 'Checking…' : 'Switch in'}
            </button>
          </form>
        </div>
      )}
    </div>
  )
}
