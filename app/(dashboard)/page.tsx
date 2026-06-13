import { requireOwner } from '@/lib/auth'
import { QuickLinks } from './quick-links'

export default async function DashboardPage() {
  const { shop } = await requireOwner()

  return (
    <div>
      <h1 className="text-xl font-semibold text-neutral-900">{shop.name}</h1>
      <p className="mt-1 text-sm text-neutral-500">
        Welcome back. Your dashboard modules land here as we build them.
      </p>
      <QuickLinks />
    </div>
  )
}
