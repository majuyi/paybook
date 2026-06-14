import { requireOwner } from '@/lib/auth'
import { ReconciliationView } from './reconciliation-view'

export default async function ReconciliationPage() {
  const { shop } = await requireOwner()

  // Default to "today" in the shop's timezone (§8.2).
  const today = new Intl.DateTimeFormat('en-CA', {
    timeZone: shop.timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date())

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-neutral-900">
          Reconciliation
        </h1>
        <p className="mt-1 text-sm text-neutral-500">
          Compare expected cash against what&apos;s in each drawer.
        </p>
      </div>
      <ReconciliationView initialDate={today} />
    </div>
  )
}
