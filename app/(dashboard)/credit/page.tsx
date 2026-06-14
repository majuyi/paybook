import { requireOwner } from '@/lib/auth'
import { CreditView } from './credit-view'

export default async function CreditPage() {
  await requireOwner()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-neutral-900">Credit</h1>
        <p className="mt-1 text-sm text-neutral-500">
          Outstanding customer balances and payments.
        </p>
      </div>
      <CreditView />
    </div>
  )
}
