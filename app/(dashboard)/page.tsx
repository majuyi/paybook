import { requireOwner } from '@/lib/auth'
import { getDashboardSummary } from '@/lib/queries/dashboard'
import { DashboardOverview } from './dashboard-overview'
import { QuickLinks } from './quick-links'

export default async function DashboardPage() {
  const { shop } = await requireOwner()
  const summary = await getDashboardSummary()

  return (
    <div>
      <h1 className="text-xl font-semibold text-neutral-900">{shop.name}</h1>
      <p className="mt-1 text-sm text-neutral-500">
        Here&apos;s where your shop stands today.
      </p>
      {summary && <DashboardOverview data={summary} />}
      <QuickLinks />
    </div>
  )
}
