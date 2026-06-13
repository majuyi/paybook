'use client'

import { useActionState } from 'react'
import { createShopAction, type OnboardingState } from './actions'

const initialState: OnboardingState = { error: null }

export function OnboardingForm() {
  const [state, formAction, pending] = useActionState(
    createShopAction,
    initialState,
  )

  return (
    <form action={formAction} className="space-y-4">
      <label className="block">
        <span className="text-sm font-medium text-neutral-700">Shop name</span>
        <input
          name="shop_name"
          required
          autoFocus
          placeholder="Mama T Stores"
          className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2.5 text-neutral-900 outline-none focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900"
        />
      </label>

      <label className="block">
        <span className="text-sm font-medium text-neutral-700">Your name</span>
        <input
          name="owner_name"
          required
          placeholder="Tunde Bello"
          className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2.5 text-neutral-900 outline-none focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900"
        />
      </label>

      <label className="block">
        <span className="text-sm font-medium text-neutral-700">
          WhatsApp number
        </span>
        <span className="block text-xs text-neutral-400">
          Where your daily briefing will be sent.
        </span>
        <input
          name="whatsapp_number"
          type="tel"
          inputMode="tel"
          required
          placeholder="0803 123 4567"
          className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2.5 text-neutral-900 outline-none focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900"
        />
      </label>

      <label className="block">
        <span className="text-sm font-medium text-neutral-700">
          Your 4-digit PIN
        </span>
        <span className="block text-xs text-neutral-400">
          Used to switch into staff mode and ring up your own sales.
        </span>
        <input
          name="pin"
          type="password"
          inputMode="numeric"
          maxLength={4}
          required
          placeholder="••••"
          className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2.5 tracking-[0.5em] text-neutral-900 outline-none focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900"
        />
      </label>

      {state.error && <p className="text-sm text-red-600">{state.error}</p>}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-lg bg-neutral-900 py-2.5 text-sm font-medium text-white transition hover:bg-neutral-800 disabled:opacity-50"
      >
        {pending ? 'Creating…' : 'Create shop'}
      </button>
    </form>
  )
}
