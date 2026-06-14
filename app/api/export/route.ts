import JSZip from 'jszip'
import { requireOwner } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { toCsv } from '@/lib/csv'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Owner-only data export (FRD §11): a ZIP of seven CSVs covering ALL records
 * including soft-deleted sales and inactive products/staff. audit_log is NOT
 * exported. Always available — no payment wall or feature flag (§11).
 *
 * Runs under the owner's Supabase session; requireOwner enforces the owner
 * account. /api is excluded from the proxy gate, so this route self-authenticates.
 */
export async function GET() {
  const { shop } = await requireOwner()
  const supabase = await createClient()
  const BIG = 100000

  // Staff name lookup (RLS scopes every query below to the owner's shop).
  const { data: staff = [] } = await supabase
    .from('staff')
    .select('id, name, phone, role, is_active, created_at')
    .eq('shop_id', shop.id)
    .limit(BIG)
  const nameById = new Map((staff ?? []).map((s) => [s.id, s.name]))

  const { data: sales = [] } = await supabase
    .from('sales')
    .select('id, sold_at, cashier_id, total, payment_method, is_deleted, deleted_at')
    .eq('shop_id', shop.id)
    .order('sold_at', { ascending: true })
    .limit(BIG)

  const { data: saleItems = [] } = await supabase
    .from('sale_items')
    .select('sale_id, product_name, quantity, sell_price, cost_price')
    .limit(BIG)

  const { data: products = [] } = await supabase
    .from('products')
    .select('name, category, sell_price, cost_price, stock_qty, is_active')
    .eq('shop_id', shop.id)
    .limit(BIG)

  const { data: credits = [] } = await supabase
    .from('customer_credits')
    .select('customer_name, customer_phone, amount_owed, is_settled, created_at')
    .eq('shop_id', shop.id)
    .limit(BIG)

  const { data: creditTxns = [] } = await supabase
    .from('credit_transactions')
    .select('credit_id, type, amount, note, recorded_by, created_at')
    .limit(BIG)

  const { data: recons = [] } = await supabase
    .from('reconciliations')
    .select('date, cashier_id, expected_cash, actual_cash, discrepancy, completed_at')
    .eq('shop_id', shop.id)
    .limit(BIG)

  const salesCsv = toCsv(
    ['id', 'sold_at', 'cashier_name', 'total', 'payment_method', 'is_deleted', 'deleted_at'],
    (sales ?? []).map((s) => ({
      id: s.id,
      sold_at: s.sold_at,
      cashier_name: (s.cashier_id && nameById.get(s.cashier_id)) || '',
      total: s.total,
      payment_method: s.payment_method,
      is_deleted: s.is_deleted,
      deleted_at: s.deleted_at,
    })),
  )

  const saleItemsCsv = toCsv(
    ['sale_id', 'product_name', 'quantity', 'sell_price', 'cost_price'],
    saleItems ?? [],
  )

  const productsCsv = toCsv(
    ['name', 'category', 'sell_price', 'cost_price', 'stock_qty', 'is_active'],
    products ?? [],
  )

  const staffCsv = toCsv(
    ['name', 'phone', 'role', 'is_active', 'created_at'],
    (staff ?? []).map((s) => ({
      name: s.name,
      phone: s.phone,
      role: s.role,
      is_active: s.is_active,
      created_at: s.created_at,
    })),
  )

  const creditsCsv = toCsv(
    ['customer_name', 'customer_phone', 'amount_owed', 'is_settled', 'created_at'],
    credits ?? [],
  )

  const creditTxnsCsv = toCsv(
    ['credit_id', 'type', 'amount', 'note', 'staff_name', 'created_at'],
    (creditTxns ?? []).map((t) => ({
      credit_id: t.credit_id,
      type: t.type,
      amount: t.amount,
      note: t.note,
      staff_name: (t.recorded_by && nameById.get(t.recorded_by)) || '',
      created_at: t.created_at,
    })),
  )

  const reconsCsv = toCsv(
    ['date', 'cashier_name', 'expected_cash', 'actual_cash', 'discrepancy', 'completed_at'],
    (recons ?? []).map((r) => ({
      date: r.date,
      cashier_name: (r.cashier_id && nameById.get(r.cashier_id)) || '',
      expected_cash: r.expected_cash,
      actual_cash: r.actual_cash,
      discrepancy: r.discrepancy,
      completed_at: r.completed_at,
    })),
  )

  const zip = new JSZip()
  zip.file('sales.csv', salesCsv)
  zip.file('sale_items.csv', saleItemsCsv)
  zip.file('products.csv', productsCsv)
  zip.file('staff.csv', staffCsv)
  zip.file('customer_credits.csv', creditsCsv)
  zip.file('credit_transactions.csv', creditTxnsCsv)
  zip.file('reconciliations.csv', reconsCsv)

  const buffer = await zip.generateAsync({ type: 'nodebuffer' })

  const today = new Intl.DateTimeFormat('en-CA', {
    timeZone: shop.timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date())
  const safeName = shop.name.replace(/[^a-zA-Z0-9]+/g, '_').replace(/^_|_$/g, '')
  const filename = `paybook_export_${safeName}_${today}.zip`

  return new Response(new Uint8Array(buffer), {
    headers: {
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}
