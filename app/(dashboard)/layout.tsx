import { requireOwner } from '@/lib/auth'
import { StaffModeProvider } from '@/lib/staff-mode/context'
import { TopNav } from './top-nav'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { shop } = await requireOwner()

  return (
    <StaffModeProvider>
      <div className="min-h-dvh bg-neutral-50">
        <TopNav shopName={shop.name} />
        <div className="mx-auto max-w-4xl px-4 py-8">{children}</div>
      </div>
    </StaffModeProvider>
  )
}
