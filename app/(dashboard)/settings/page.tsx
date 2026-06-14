import { requireOwner } from '@/lib/auth'
import { SettingsContent } from './settings-content'

export default async function SettingsPage() {
  const { shop } = await requireOwner()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-neutral-900">Settings</h1>
        <p className="mt-1 text-sm text-neutral-500">
          Shop preferences and data export.
        </p>
      </div>
      <SettingsContent
        initial={{
          name: shop.name,
          whatsappNumber: shop.whatsapp_number,
          briefingTime: shop.briefing_time.slice(0, 5),
          briefingEnabled: shop.briefing_enabled,
          reconTolerance: Number(shop.recon_tolerance),
          currency: shop.currency,
        }}
      />
    </div>
  )
}
