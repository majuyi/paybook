import { requireOwner } from '@/lib/auth'
import { listStaff } from '@/lib/queries/staff'
import { RoleGuard } from '@/lib/staff-mode/role-guard'
import { CreateStaffForm } from './create-staff-form'
import { StaffList } from './staff-list'

export default async function StaffPage() {
  const { shop } = await requireOwner()
  const staff = await listStaff(shop.id)
  const activeCount = staff.filter((s) => s.is_active).length

  return (
    <RoleGuard allow={['owner']}>
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-semibold text-neutral-900">Staff</h1>
        <p className="mt-1 text-sm text-neutral-500">
          {activeCount} of 20 active accounts. Cashiers and managers sign in
          with a 4-digit PIN.
        </p>
      </div>

      <section className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm">
        <h2 className="text-sm font-medium text-neutral-900">Add staff</h2>
        <div className="mt-4">
          <CreateStaffForm atLimit={activeCount >= 20} />
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-medium text-neutral-900">
          Team members
        </h2>
        <StaffList staff={staff} />
      </section>
    </div>
    </RoleGuard>
  )
}
