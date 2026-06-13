'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { normalizeNgPhone } from '@/lib/phone'

type Step = 'phone' | 'otp'

export default function LoginPage() {
  const router = useRouter()
  const supabase = createClient()

  const [step, setStep] = useState<Step>('phone')
  const [phoneInput, setPhoneInput] = useState('')
  const [phone, setPhone] = useState('')
  const [token, setToken] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function sendOtp(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    const normalized = normalizeNgPhone(phoneInput)
    if (!normalized) {
      setError('Enter a valid Nigerian phone number, e.g. 0803 123 4567.')
      return
    }
    setLoading(true)
    const { error } = await supabase.auth.signInWithOtp({ phone: normalized })
    setLoading(false)
    if (error) {
      setError(error.message)
      return
    }
    setPhone(normalized)
    setStep('otp')
  }

  async function verifyOtp(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    const { error } = await supabase.auth.verifyOtp({
      phone,
      token: token.trim(),
      type: 'sms',
    })
    setLoading(false)
    if (error) {
      setError(error.message)
      return
    }
    // Session cookie is set; the app shell decides login vs onboarding.
    router.replace('/')
    router.refresh()
  }

  return (
    <main className="flex min-h-dvh items-center justify-center bg-neutral-50 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-semibold tracking-tight text-neutral-900">
            Paybook
          </h1>
          <p className="mt-1 text-sm text-neutral-500">
            Sign in to your shop
          </p>
        </div>

        <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
          {step === 'phone' ? (
            <form onSubmit={sendOtp} className="space-y-4">
              <label className="block">
                <span className="text-sm font-medium text-neutral-700">
                  Phone number
                </span>
                <input
                  type="tel"
                  inputMode="tel"
                  autoFocus
                  placeholder="0803 123 4567"
                  value={phoneInput}
                  onChange={(e) => setPhoneInput(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2.5 text-neutral-900 outline-none focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900"
                />
              </label>
              {error && <p className="text-sm text-red-600">{error}</p>}
              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-lg bg-neutral-900 py-2.5 text-sm font-medium text-white transition hover:bg-neutral-800 disabled:opacity-50"
              >
                {loading ? 'Sending…' : 'Send code'}
              </button>
            </form>
          ) : (
            <form onSubmit={verifyOtp} className="space-y-4">
              <p className="text-sm text-neutral-600">
                Enter the 6-digit code sent to{' '}
                <span className="font-medium text-neutral-900">{phone}</span>.
              </p>
              <label className="block">
                <span className="text-sm font-medium text-neutral-700">
                  Verification code
                </span>
                <input
                  type="text"
                  inputMode="numeric"
                  autoFocus
                  placeholder="123456"
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2.5 tracking-widest text-neutral-900 outline-none focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900"
                />
              </label>
              {error && <p className="text-sm text-red-600">{error}</p>}
              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-lg bg-neutral-900 py-2.5 text-sm font-medium text-white transition hover:bg-neutral-800 disabled:opacity-50"
              >
                {loading ? 'Verifying…' : 'Verify'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setStep('phone')
                  setToken('')
                  setError(null)
                }}
                className="w-full text-center text-sm text-neutral-500 hover:text-neutral-700"
              >
                Use a different number
              </button>
            </form>
          )}
        </div>
      </div>
    </main>
  )
}
