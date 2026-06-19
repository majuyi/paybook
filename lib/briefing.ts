export type BriefingData = {
  totalRevenue: number
  estimatedProfit: number
  saleCount: number
  cashStatus: string
  lowStock: { name: string; qty: number }[]
  lowStockMore: number
  creditCount: number
  creditTotal: number
}

const money = (n: number) =>
  n.toLocaleString('en-NG', { minimumFractionDigits: 0, maximumFractionDigits: 2 })

/**
 * Coerce a raw row from briefing_data / dashboard_summary into BriefingData.
 * Both RPCs return the same eight columns; numbers arrive as strings over the
 * wire for numeric/jsonb, so everything is re-parsed here.
 */
export function normalizeBriefingData(raw: Record<string, unknown>): BriefingData {
  const lowStock = Array.isArray(raw.low_stock)
    ? (raw.low_stock as { name: string; qty: number }[]).map((x) => ({
        name: String(x.name),
        qty: Number(x.qty),
      }))
    : []
  return {
    totalRevenue: Number(raw.total_revenue),
    estimatedProfit: Number(raw.estimated_profit),
    saleCount: Number(raw.sale_count),
    cashStatus: String(raw.cash_status),
    lowStock,
    lowStockMore: Number(raw.low_stock_more),
    creditCount: Number(raw.credit_count),
    creditTotal: Number(raw.credit_total),
  }
}

/**
 * The §10.1 briefing message. The "Manage your shop: paybook.ng" footer is in
 * every briefing and is not configurable. No cashier names or per-cashier
 * performance appear here (§10.3) — cash status is the only accountability line
 * and it is an aggregate.
 */
export function composeBriefing(
  shopName: string,
  dateStr: string,
  d: BriefingData,
): string {
  // Parse the YYYY-MM-DD at noon UTC so the weekday/label never shift.
  const date = new Date(dateStr + 'T12:00:00Z')
  const weekday = date.toLocaleDateString('en-NG', { weekday: 'long', timeZone: 'UTC' })
  const longDate = date.toLocaleDateString('en-NG', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  })

  const lines: string[] = [
    `📊 Paybook Daily Summary — ${shopName}`,
    `${weekday}, ${longDate}`,
    '',
    `Revenue:       ₦${money(d.totalRevenue)}`,
    `Est. Profit:   ₦${money(d.estimatedProfit)}`,
    `Sales:         ${d.saleCount} transactions`,
    '',
    `Cash status:   ${d.cashStatus}`,
    '',
    '⚠️ Low Stock',
  ]

  if (d.lowStock.length === 0) {
    lines.push('None')
  } else {
    for (const item of d.lowStock) lines.push(`${item.name} — ${item.qty} left`)
    if (d.lowStockMore > 0) lines.push(`+ ${d.lowStockMore} more`)
  }

  lines.push(
    '',
    '💳 Outstanding Credit',
    `${d.creditCount} customers owe ₦${money(d.creditTotal)} total`,
    '',
    'Manage your shop: paybook.ng',
  )

  return lines.join('\n')
}
