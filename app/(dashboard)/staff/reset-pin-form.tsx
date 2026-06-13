'use client'

import { useActionState, useEffect } from 'react'
import { resetPinAction, type StaffActionState } from './actions'

const initial: StaffActionState = { error: null }

export function ResetPinForm({
  staffId,
  onDone,
}: {
  staffId: string
  onDone: () => void
}) {
  const [state, formAction, pending] = useActionState(resetPinAction, initial)

  useEffect(() => {
    if (state.ok) onDone()
  }, [state.ok, onDone])

  return (
    <form action={formAction} className="mt-3 flex flex-wrap items-center gap-2">
      <input type="hidden" name="staff_id" value={staffId} />
      <input
        name="pin"
        type="password"
        inputMode="numeric"
        maxLength={4}
        required
        autoFocus
        placeholder="New PIN"
        className="w-28 rounded-lg border border-neutral-300 px-3 py-1.5 text-sm tracking-[0.3em] outline-none focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900"
      />
      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-neutral-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-neutral-800 disabled:opacity-50"
      >
        {pending ? 'Saving…' : 'Save PIN'}
      </button>
      <button
        type="button"
        onClick={onDone}
        className="text-xs text-neutral-500 hover:text-neutral-700"
      >
        Cancel
      </button>
      {state.error && <span className="text-xs text-red-600">{state.error}</span>}
    </form>
  )
}
