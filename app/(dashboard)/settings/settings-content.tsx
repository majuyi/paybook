'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useStaffMode } from '@/lib/staff-mode/context'
import { RoleGuard } from '@/lib/staff-mode/role-guard'
import { logoutAction } from '../actions'
import { updateSettingsAction } from './actions'

const inputClass =
  'mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm text-neutral-900 outline-none focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900'

export type SettingsValues = {
  name: string
  whatsappNumber: string
  briefingTime: string // "HH:MM"
  briefingEnabled: boolean
  reconTolerance: number
  currency: string
}

export function SettingsContent({ initial }: { initial: SettingsValues }) {
  const router = useRouter()
  const { active } = useStaffMode()

  const [name, setName] = useState(initial.name)
  const [whatsapp, setWhatsapp] = useState(initial.whatsappNumber)
  const [briefingTime, setBriefingTime] = useState(initial.briefingTime)
  const [briefingEnabled, setBriefingEnabled] = useState(initial.briefingEnabled)
  const [reconTolerance, setReconTolerance] = useState(String(initial.reconTolerance))
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  async function save(e: React.FormEvent) {
    e.preventDefault()
    setPending(true)
    setError(null)
    setSaved(false)
    const res = await updateSettingsAction(active?.id ?? null, {
      name,
      whatsappNumber: whatsapp,
      briefingTime,
      briefingEnabled,
      reconTolerance: Number(reconTolerance),
    })
    setPending(false)
    if (res.error) {
      setError(res.error)
      return
    }
    setSaved(true)
    router.refresh()
  }

  return (
    <RoleGuard allow={['owner']}>
      <div className="space-y-6">
        <form
          onSubmit={save}
          className="space-y-4 rounded-xl border border-neutral-200 bg-white p-5 shadow-sm"
        >
          <h2 className="text-sm font-medium text-neutral-900">Shop</h2>

          <label className="block">
            <span className="text-sm font-medium text-neutral-700">Shop name</span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className={inputClass}
            />
          </label>

          <label className="block">
            <span className="text-sm font-medium text-neutral-700">
              Owner WhatsApp number
            </span>
            <span className="block text-xs text-neutral-400">
              Where the daily briefing is sent. Takes effect from the next briefing.
            </span>
            <input
              value={whatsapp}
              onChange={(e) => setWhatsapp(e.target.value)}
              type="tel"
              required
              className={inputClass}
            />
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="text-sm font-medium text-neutral-700">
                Briefing time
              </span>
              <input
                value={briefingTime}
                onChange={(e) => setBriefingTime(e.target.value)}
                type="time"
                required
                className={inputClass}
              />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-neutral-700">
                Reconciliation tolerance ({initial.currency})
              </span>
              <input
                value={reconTolerance}
                onChange={(e) => setReconTolerance(e.target.value)}
                type="number"
                min="0"
                step="0.01"
                required
                className={inputClass}
              />
            </label>
          </div>

          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={briefingEnabled}
              onChange={(e) => setBriefingEnabled(e.target.checked)}
              className="h-4 w-4 rounded border-neutral-300"
            />
            <span className="text-sm text-neutral-700">
              Send the daily WhatsApp briefing
            </span>
          </label>

          {error && <p className="text-sm text-red-600">{error}</p>}
          {saved && <p className="text-sm text-green-700">Settings saved.</p>}

          <button
            type="submit"
            disabled={pending}
            className="rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-50"
          >
            {pending ? 'Saving…' : 'Save settings'}
          </button>
        </form>

        <section className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-medium text-neutral-900">Data export</h2>
          <p className="mt-1 text-sm text-neutral-500">
            Download all your shop data as a ZIP of CSV files. Always available.
          </p>
          <a
            href="/api/export"
            className="mt-4 inline-block rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800"
          >
            Export data (ZIP)
          </a>
        </section>

        <section className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-medium text-neutral-900">Account</h2>
          <form action={logoutAction} className="mt-3">
            <button
              type="submit"
              className="rounded-lg border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
            >
              Log out
            </button>
          </form>
        </section>
      </div>
    </RoleGuard>
  )
}
