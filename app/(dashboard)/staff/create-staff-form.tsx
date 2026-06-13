'use client'

import { useActionState, useEffect, useRef } from 'react'
import { createStaffAction, type StaffActionState } from './actions'

const initial: StaffActionState = { error: null }

const inputClass =
  'mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm text-neutral-900 outline-none focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900'

export function CreateStaffForm({ atLimit }: { atLimit: boolean }) {
  const [state, formAction, pending] = useActionState(createStaffAction, initial)
  const formRef = useRef<HTMLFormElement>(null)

  useEffect(() => {
    if (state.ok) formRef.current?.reset()
  }, [state.ok, state])

  if (atLimit) {
    return (
      <p className="text-sm text-amber-700">
        You&apos;ve reached the 20-account limit. Deactivate an account to add a
        new one.
      </p>
    )
  }

  return (
    <form ref={formRef} action={formAction} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="text-sm font-medium text-neutral-700">Name</span>
          <input name="name" required placeholder="Ada Okafor" className={inputClass} />
        </label>
        <label className="block">
          <span className="text-sm font-medium text-neutral-700">Role</span>
          <select name="role" required defaultValue="cashier" className={inputClass}>
            <option value="cashier">Cashier</option>
            <option value="manager">Manager</option>
          </select>
        </label>
        <label className="block">
          <span className="text-sm font-medium text-neutral-700">
            Phone <span className="text-neutral-400">(optional)</span>
          </span>
          <input
            name="phone"
            type="tel"
            inputMode="tel"
            placeholder="0803 123 4567"
            className={inputClass}
          />
        </label>
        <label className="block">
          <span className="text-sm font-medium text-neutral-700">4-digit PIN</span>
          <input
            name="pin"
            type="password"
            inputMode="numeric"
            maxLength={4}
            required
            placeholder="••••"
            className={`${inputClass} tracking-[0.4em]`}
          />
        </label>
      </div>

      {state.error && <p className="text-sm text-red-600">{state.error}</p>}
      {state.ok && <p className="text-sm text-green-700">Staff member added.</p>}

      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-neutral-800 disabled:opacity-50"
      >
        {pending ? 'Adding…' : 'Add staff'}
      </button>
    </form>
  )
}
