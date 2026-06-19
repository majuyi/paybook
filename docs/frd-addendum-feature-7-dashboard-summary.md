# FRD Addendum — Feature 7: In-App Dashboard Summary

> Status: **In scope, built.** Added 2026-06-19 as a formal addendum to the
> Phase 1 FRD. The FRD proper (the six original features and the build order)
> lives outside this repo; this file records a seventh feature added after the
> fact so it doesn't sit in the codebase unexamined.

## What it is

The home dashboard shows the shop owner the **same six figures as the daily
WhatsApp briefing (FRD §10), but live and for *today***:

- Revenue so far today
- Estimated profit
- Sale count
- Cash status (Reconciled / Pending / Not started)
- Outstanding credit (total + number of customers owing)
- Low-stock items (with a "+N more" overflow)

It is read-only — a glanceable summary, not a new data surface. Every figure is
already defined and computed for §10; this feature surfaces them in the app
instead of only over WhatsApp once a day.

## Why it's in scope

- **Zero new data model.** It reuses the existing `briefing_data()` computation
  verbatim (FRD §10). No new tables, no new metrics, no new definitions of
  "revenue" or "profit" to keep in sync.
- **Closes a gap in the briefing.** The briefing is a once-a-day push at a fixed
  time. An owner who opens the app midday currently sees nothing about how today
  is going. This is the same information, on demand.
- **Reinforces the role model.** Financial figures (revenue, profit, cash
  status, credit) are owner/manager only; a cashier sees only the operational
  ones (sales, low stock) — mirroring the existing `QuickLinks` gating.

## Scope / non-goals

- **Today only.** No date picker, no history, no charts. Historical reporting is
  out of scope for this feature.
- **No new writes or actions.** Display only.
- **No client-side polling.** Figures are fetched once, server-side, on page
  load. (A future iteration could refresh on an interval — explicitly not in
  this one.)

## How it's built

- **DB:** `dashboard_summary()` (`supabase/migrations/0012_dashboard_summary.sql`)
  — a `SECURITY DEFINER` wrapper that takes **no arguments**. It derives the shop
  from `auth.uid()` and "today" in the shop's timezone, then delegates to
  `briefing_data(shop_id, date)`. `briefing_data` stays revoked from
  `authenticated` because it accepts an arbitrary `shop_id`; the wrapper only
  ever passes the caller's own shop, so an owner can read only their own figures.
  Execute is granted to `authenticated` only.
- **Server query:** `lib/queries/dashboard.ts` → `getDashboardSummary()`. Returns
  `null` on error so the page degrades gracefully to quick links.
- **Shared normalization:** `normalizeBriefingData()` in `lib/briefing.ts` is now
  exported and shared by both the briefing cron and this query (numeric/jsonb
  columns arrive as strings over the wire and are re-parsed once, in one place).
- **UI:** `app/(dashboard)/dashboard-overview.tsx` — a client component that
  applies the role gating; rendered from `app/(dashboard)/page.tsx`.

## Build-order note

Sequenced **after** Feature 6 (the briefing, §10) by necessity — it depends on
`briefing_data()` existing. Slots in as Feature 7 in the build order.
