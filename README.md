# Paybook — Phase 1 (Web)

Next.js 16 (App Router) + Supabase. A point-of-sale / bookkeeping tool for
Nigerian shop owners: sale logging, inventory, staff PINs, daily cash
reconciliation, customer credit, a WhatsApp daily briefing, and data export.

This README is the path from a **fresh clone to a running app**. It assumes you
have access to the Supabase project and (for deploys) the Vercel project.

---

## 1. Prerequisites

- Node 18+ and npm
- [Supabase CLI](https://supabase.com/docs/guides/cli) (`brew install supabase/tap/supabase`)
- Access to the Supabase project **`paybook`** (ref `xzscylijovlgfclfofvp`, org
  "The Paybook Organization", region eu-west-1)

## 2. Fresh clone → running locally

```bash
git clone <repo> && cd paybook
npm install
cp .env.local.example .env.local      # then fill in the values (section 3)
npm run dev                            # http://localhost:3000
```

`npm run lint` and `npx tsc --noEmit` should both be clean.

> The app boots without the SMS/WhatsApp providers configured. You just won't be
> able to receive a login OTP or deliver a briefing until you set them up
> (sections 5–6). For local UI work, add a Supabase **test phone number**
> (section 5) so OTP login works without sending real SMS.

## 3. Environment variables

All live in `.env.local` (gitignored). On Vercel, set the same keys in
**Project → Settings → Environment Variables**. Find the Supabase values in the
Supabase dashboard under **Project Settings → API**.

| Variable | What it's for | Where to find it |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL. Public (sent to the browser). | Project Settings → API → Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Anon/publishable key for the browser + server clients. RLS-protected, safe to expose. | Project Settings → API → Project API keys → `anon` / publishable |
| `SUPABASE_SERVICE_ROLE_KEY` | **Server-only.** Bypasses RLS. Used by the briefing cron and any privileged path. Never sent to the browser (guarded by `server-only`). | Project Settings → API → Project API keys → `service_role` / secret |
| `CRON_SECRET` | Bearer token the briefing cron requires. Vercel Cron sends it automatically. | You choose it — a long random string |
| `TWILIO_ACCOUNT_SID` | Twilio account SID (briefing delivery). | Twilio console → Account Info |
| `TWILIO_AUTH_TOKEN` | Twilio auth token. **Server-only.** | Twilio console → Account Info |
| `TWILIO_WHATSAPP_FROM` | WhatsApp sender, e.g. `whatsapp:+14155238886` (sandbox or approved sender). | Twilio console → Messaging → WhatsApp |

Until all three `TWILIO_*` vars are set, the briefing dispatch runs but does not
deliver (it records the attempt and retries once — by design).

## 4. Database migrations

All schema, RLS, and functions live in `supabase/migrations/` (`0001`–`0011`).
To apply them to a **fresh** Supabase project:

```bash
supabase login                                   # or: supabase login --token <PAT>
supabase link --project-ref xzscylijovlgfclfofvp # the DB password is requested here
supabase db push                                 # applies 0001 → 0011 in order
```

- `supabase db push` is idempotent — it only applies migrations not yet on the
  remote.
- After any schema change, regenerate the typed client:
  `supabase gen types typescript --linked > lib/database.types.ts`
- The migrations assume a stock Supabase project (the `pgcrypto`/`gen_random_uuid`
  and `uuid-ossp` extensions are enabled by `0001`/`0002`).

## 5. SMS provider (phone-OTP login)

Login is **phone OTP only** (no email/password). Supabase Auth does not send SMS
itself — wire a provider:

1. Supabase dashboard → **Authentication → Sign In / Providers → Phone** → enable.
2. Choose **Twilio** and fill in: Account SID, Auth Token, and a Messaging
   Service SID (or From number). (Twilio console → Messaging.)
3. Save. Owners can now log in with their Nigerian number and receive a code.

**Testing without real SMS:** Supabase → Authentication → Phone → **Test OTP** —
add a number + fixed code (e.g. `+2348000000001` → `123456`). That number then
logs in with the fixed code, no provider charge.

## 6. WhatsApp Business API (daily briefing)

The briefing is composed and dispatched by `app/api/cron/briefing/route.ts`; the
send is implemented against **Twilio's Messages API** in `lib/whatsapp-dispatch.ts`.

1. **Test fast with the Twilio WhatsApp sandbox.** Twilio console → Messaging →
   Try it out → WhatsApp. Join the sandbox from your phone (send the join code to
   the sandbox number). Set `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, and
   `TWILIO_WHATSAPP_FROM=whatsapp:+14155238886` (the sandbox number). Sandbox
   freeform messages deliver to joined numbers — enough to verify end to end.
2. **For production, register a template.** The daily briefing is
   business-initiated, so outside a 24-hour user session WhatsApp requires an
   approved template (freeform fails with Twilio error `63016`). Register the
   §10.1 briefing as a Twilio **Content template** and switch the send from
   `Body` to `ContentSid` + `ContentVariables` in `lib/whatsapp-dispatch.ts`.
   (The §9.3 credit reminder text is in `lib/whatsapp.ts`; the briefing text is in
   `lib/briefing.ts`.)

Until the `TWILIO_*` vars are set, briefings record `pending_retry` → `failed`
and never deliver. The in-app credit reminder button uses a `wa.me` deep link and
works today without any of this.

## 7. Vercel cron (briefing scheduler)

`vercel.json` registers a cron that calls `/api/cron/briefing`. On each run the
handler dispatches every `briefing_enabled` shop whose `briefing_time` has passed
that day (in the shop's timezone) and hasn't been sent yet — deduped + retried
once via the `briefing_dispatches` table.

The committed schedule is **`0 19 * * *`** (daily at 19:00 UTC = 20:00
Africa/Lagos, the default `briefing_time`) so it works on the **Vercel Hobby**
plan, which only allows one cron run per day.

Setup:

1. Set **`CRON_SECRET`** in the Vercel project env (same value everywhere).
   Vercel Cron automatically sends `Authorization: Bearer <CRON_SECRET>`.
2. **Hobby limitation:** a single daily run can't honor arbitrary per-shop
   `briefing_time`s — shops are effectively briefed around the daily run time,
   and a shop whose time is *after* the run may slip to the next day. For true
   per-shop timing, upgrade to **Vercel Pro** and change the schedule to
   `*/5 * * * *` (every 5 minutes); the handler logic already supports it.

Verify it's firing:

- Vercel dashboard → your project → **Cron Jobs** (run history) and **Logs**.
- Or hit it manually:
  ```bash
  curl -H "Authorization: Bearer $CRON_SECRET" \
    "https://<your-app>/api/cron/briefing"
  ```
- **Preview without sending** with the dry-run flag (returns the composed
  message per shop, no send, no record):
  ```bash
  curl -H "Authorization: Bearer $CRON_SECRET" \
    "https://<your-app>/api/cron/briefing?dryRun=1"
  ```
  A request without the correct secret returns `401`.

## 8. Deploy (Vercel)

1. Import the repo into Vercel.
2. Add all env vars from section 3 (production scope).
3. Deploy. The cron is picked up from `vercel.json`.
4. Configure the Supabase Auth → URL config to allow your production domain.

---

## Architecture notes (the non-obvious bits)

- **Auth model:** the web app runs entirely under the **owner's** Supabase
  session. Cashier/manager are resolved by 4-digit PIN at the app layer and held
  **in memory only** (a refresh returns to owner view). RLS enforces the shop
  boundary; owner/manager/cashier role rules are enforced in server actions
  (`lib/staff-mode/resolve-actor.ts` turns the in-memory staff id into a
  DB-verified role).
- **Multi-table writes** (sales, onboarding, staff, stock, credit,
  reconciliation) go through `SECURITY DEFINER` Postgres functions so they're
  atomic and can write `audit_log` (which has no client INSERT policy).
- **`sale_items` are denormalized** — name/price captured at sale time; never
  join back to `products` for historical figures.
- **No hard deletes:** products/staff/sales/credits use `is_active`/`is_deleted`/
  `is_settled`. Several `staff`/`product` foreign keys are `RESTRICT` (no
  cascade) — relevant only if you ever script a full shop teardown (delete
  children before parents).
