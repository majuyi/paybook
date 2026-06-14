import { requireOwner } from '@/lib/auth'
import { SettingsContent } from './settings-content'

export default async function SettingsPage() {
  await requireOwner()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-neutral-900">Settings</h1>
        <p className="mt-1 text-sm text-neutral-500">
          Shop preferences and data export.
        </p>
      </div>
      <SettingsContent />
    </div>
  )
}
