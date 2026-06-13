import { redirect } from 'next/navigation'
import { getOwnerContext } from '@/lib/queries/shop'
import { OnboardingForm } from './onboarding-form'

export default async function OnboardingPage() {
  const ctx = await getOwnerContext()
  if (!ctx) redirect('/login')
  // Already onboarded → straight to the dashboard.
  if (ctx.shop) redirect('/')

  return (
    <main className="flex min-h-dvh items-center justify-center bg-neutral-50 px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-semibold tracking-tight text-neutral-900">
            Set up your shop
          </h1>
          <p className="mt-1 text-sm text-neutral-500">
            A few details to get Paybook running.
          </p>
        </div>
        <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
          <OnboardingForm />
        </div>
      </div>
    </main>
  )
}
