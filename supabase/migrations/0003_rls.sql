-- Paybook Phase 1 — Section 3: Row Level Security
--
-- AUTH MODEL (per §4, confirmed): the web app runs entirely under the OWNER's
-- Supabase Auth session. There is no per-staff DB identity in Phase 1, so RLS
-- cannot distinguish cashier vs manager vs owner. RLS therefore enforces the
-- SHOP BOUNDARY only: an authenticated owner can reach exactly their own shop's
-- rows. Owner/manager/cashier granularity (cashier-own-sales, hide cost_price,
-- owner-only delete, etc.) is enforced in the application/server-action layer,
-- exactly as §4 mandates ("Do not rely solely on RLS for cashier restrictions").
--
-- PRIVILEGED SERVER PATHS (service-role key, bypasses RLS):
--   * audit_log INSERT  — §3 requires "server-side function only, never direct
--     client insert", so there is intentionally NO client INSERT policy below.
--   * Soft-delete of sales, staff PIN hashing, etc. run in server actions.
-- Tables with no policy for a given command deny that command by default, which
-- is how the "no DELETE" rules (products, staff, sales, credits, recon) are met.

-- ============================================================
-- Helper: does the current auth user own this shop?
-- SECURITY DEFINER so the lookup itself bypasses RLS (avoids recursion).
-- ============================================================
CREATE OR REPLACE FUNCTION public.current_user_owns_shop(target_shop uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM shops
    WHERE id = target_shop AND owner_id = auth.uid()
  );
$$;

-- ============================================================
-- Enable RLS on every table (§3 — no exceptions)
-- ============================================================
ALTER TABLE shops               ENABLE ROW LEVEL SECURITY;
ALTER TABLE products            ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff               ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales               ENABLE ROW LEVEL SECURITY;
ALTER TABLE sale_items          ENABLE ROW LEVEL SECURITY;
ALTER TABLE reconciliations     ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_credits    ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log           ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- shops  (§3: owner SELECT + UPDATE own shop; §4: owner creates shop on first login)
-- ============================================================
CREATE POLICY shops_select ON shops
  FOR SELECT TO authenticated
  USING (owner_id = auth.uid());

CREATE POLICY shops_insert ON shops
  FOR INSERT TO authenticated
  WITH CHECK (owner_id = auth.uid());   -- enables first-login shop creation (§4)

CREATE POLICY shops_update ON shops
  FOR UPDATE TO authenticated
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());
-- No DELETE policy.

-- ============================================================
-- products  (§3: shop staff SELECT; owner/manager INSERT+UPDATE; no DELETE)
-- App layer hides cost_price from cashier and filters is_active for the picker.
-- ============================================================
CREATE POLICY products_select ON products
  FOR SELECT TO authenticated
  USING (current_user_owns_shop(shop_id));

CREATE POLICY products_insert ON products
  FOR INSERT TO authenticated
  WITH CHECK (current_user_owns_shop(shop_id));

CREATE POLICY products_update ON products
  FOR UPDATE TO authenticated
  USING (current_user_owns_shop(shop_id))
  WITH CHECK (current_user_owns_shop(shop_id));
-- No DELETE policy (§6.2: use is_active = false).

-- ============================================================
-- staff  (§3: owner SELECT all / INSERT / UPDATE; no DELETE — §7.2 is_active=false)
-- PIN hashing happens in the server action; never stored/logged plaintext.
-- ============================================================
CREATE POLICY staff_select ON staff
  FOR SELECT TO authenticated
  USING (current_user_owns_shop(shop_id));

CREATE POLICY staff_insert ON staff
  FOR INSERT TO authenticated
  WITH CHECK (current_user_owns_shop(shop_id));

CREATE POLICY staff_update ON staff
  FOR UPDATE TO authenticated
  USING (current_user_owns_shop(shop_id))
  WITH CHECK (current_user_owns_shop(shop_id));
-- No DELETE policy.

-- ============================================================
-- sales  (§3: staff INSERT; SELECT scoped to shop; owner-only soft-delete = UPDATE)
-- Sale rows are immutable except the soft-delete fields; the server action
-- enforces that only is_deleted/deleted_by/deleted_at change and only by owner.
-- ============================================================
CREATE POLICY sales_select ON sales
  FOR SELECT TO authenticated
  USING (current_user_owns_shop(shop_id));

CREATE POLICY sales_insert ON sales
  FOR INSERT TO authenticated
  WITH CHECK (current_user_owns_shop(shop_id));

CREATE POLICY sales_update ON sales
  FOR UPDATE TO authenticated
  USING (current_user_owns_shop(shop_id))
  WITH CHECK (current_user_owns_shop(shop_id));
-- No DELETE policy (§5.2: soft delete only).

-- ============================================================
-- sale_items  (§3: access mirrors the parent sale)
-- ============================================================
CREATE POLICY sale_items_select ON sale_items
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM sales s
    WHERE s.id = sale_items.sale_id
      AND current_user_owns_shop(s.shop_id)
  ));

CREATE POLICY sale_items_insert ON sale_items
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM sales s
    WHERE s.id = sale_items.sale_id
      AND current_user_owns_shop(s.shop_id)
  ));
-- No UPDATE/DELETE policy (items immutable; removed only via parent ON DELETE CASCADE).

-- ============================================================
-- reconciliations  (§3: owner/manager SELECT/INSERT/UPDATE; cashier NONE; never deleted)
-- §8.4 completion lock (no actual_cash edit once completed_at set) is enforced in
-- the server action; can be hardened with a guard trigger if you want it at the DB.
-- ============================================================
CREATE POLICY recon_select ON reconciliations
  FOR SELECT TO authenticated
  USING (current_user_owns_shop(shop_id));

CREATE POLICY recon_insert ON reconciliations
  FOR INSERT TO authenticated
  WITH CHECK (current_user_owns_shop(shop_id));

CREATE POLICY recon_update ON reconciliations
  FOR UPDATE TO authenticated
  USING (current_user_owns_shop(shop_id))
  WITH CHECK (current_user_owns_shop(shop_id));
-- No DELETE policy (§8.4: permanent).

-- ============================================================
-- customer_credits  (§3: owner/manager full; cashier INSERT+SELECT; no hard delete)
-- ============================================================
CREATE POLICY credits_select ON customer_credits
  FOR SELECT TO authenticated
  USING (current_user_owns_shop(shop_id));

CREATE POLICY credits_insert ON customer_credits
  FOR INSERT TO authenticated
  WITH CHECK (current_user_owns_shop(shop_id));

CREATE POLICY credits_update ON customer_credits
  FOR UPDATE TO authenticated
  USING (current_user_owns_shop(shop_id))
  WITH CHECK (current_user_owns_shop(shop_id));
-- No DELETE policy (§9.2: is_settled=true is terminal).

-- ============================================================
-- credit_transactions  (§3: same as customer_credits — scoped via parent credit's shop)
-- ============================================================
CREATE POLICY credit_txn_select ON credit_transactions
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM customer_credits c
    WHERE c.id = credit_transactions.credit_id
      AND current_user_owns_shop(c.shop_id)
  ));

CREATE POLICY credit_txn_insert ON credit_transactions
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM customer_credits c
    WHERE c.id = credit_transactions.credit_id
      AND current_user_owns_shop(c.shop_id)
  ));
-- No UPDATE/DELETE policy (ledger is append-only).

-- ============================================================
-- audit_log  (§3: SELECT owner only; INSERT server-side function only)
-- Intentionally NO client INSERT policy — writes go through a service-role
-- server action / SECURITY DEFINER fn so clients can never forge audit rows.
-- ============================================================
CREATE POLICY audit_select ON audit_log
  FOR SELECT TO authenticated
  USING (current_user_owns_shop(shop_id));
-- No INSERT/UPDATE/DELETE policy for clients.
