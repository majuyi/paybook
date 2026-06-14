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
| `WHATSAPP_API_TOKEN` | WhatsApp Business API token (briefing delivery). | Your Twilio / 360dialog console (section 6) |
| `WHATSAPP_PHONE_NUMBER_ID` | The sending WhatsApp number/sender id. | Your Twilio / 360dialog console (section 6) |

Until both `WHATSAPP_*` are set, the briefing dispatch runs but does not deliver
(it records the attempt and retries once — by design).

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
actual send lives in `lib/whatsapp-dispatch.ts`.

1. Get a WhatsApp Business API sender via **Twilio** or **360dialog**.
2. Set `WHATSAPP_API_TOKEN` and `WHATSAPP_PHONE_NUMBER_ID` (sections 3).
3. **Implement the provider call** in `lib/whatsapp-dispatch.ts` — it is
   currently a stub that returns a failure (search for the `TODO`). Make it POST
   the message and return `{ ok: true }` on a 2xx.
4. **Register the templates first.** The §9.3 credit reminder and the §10.1
   briefing text must be registered/approved with the Business API before they
   can be sent. The reminder template text is in `lib/whatsapp.ts`; the briefing
   text is in `lib/briefing.ts`.

Until step 3 is done, briefings record `pending_retry` → `failed` and never
deliver. (The in-app credit reminder button uses a `wa.me` deep link and works
today without any of this.)

## 7. Vercel cron (briefing scheduler)

`vercel.json` registers a cron that calls `/api/cron/briefing` every 5 minutes.
The handler checks each shop's `briefing_time`/`timezone` and dispatches the ones
due within the last 5 minutes (dedup + retry-once via the `briefing_dispatches`
table).

Setup:

1. Set **`CRON_SECRET`** in the Vercel project env (same value everywhere).
   Vercel Cron automatically sends `Authorization: Bearer <CRON_SECRET>`.
2. The `*/5 * * * *` schedule requires a **Vercel Pro** plan (Hobby runs crons
   once per day only). On Hobby, change the schedule in `vercel.json` and accept
   coarser timing.

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
