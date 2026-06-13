-- Paybook Phase 1 — Schema support objects (not part of the verbatim §2 spec)
-- 1. products.updated_at auto-maintenance (approved: DB trigger)
-- 2. Indexes serving the §8.2 reconciliation, §10.2 briefing, and §5.1 search queries
--    plus the <500ms search / <3s sale NFRs in §13.

-- pg_trgm powers the case-insensitive partial product-name search (§5.1).
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- ---------- updated_at trigger ----------
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER products_set_updated_at
BEFORE UPDATE ON products
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

-- ---------- indexes ----------

-- sales: reconciliation & briefing filter on shop_id + DATE(sold_at) (+ payment_method, is_deleted)
CREATE INDEX idx_sales_shop_sold_at   ON sales (shop_id, sold_at);
-- sales: cashier-own-sales view (§5.2 / §7.1)
CREATE INDEX idx_sales_cashier        ON sales (cashier_id);

-- sale_items: joined back to their parent sale everywhere
CREATE INDEX idx_sale_items_sale      ON sale_items (sale_id);
CREATE INDEX idx_sale_items_product   ON sale_items (product_id);

-- products: picker / inventory list filter on shop_id + is_active; low-stock sort on stock_qty
CREATE INDEX idx_products_shop_active ON products (shop_id, is_active);
-- products: case-insensitive partial name search (ILIKE '%term%')
CREATE INDEX idx_products_name_trgm   ON products USING gin (name gin_trgm_ops);

-- staff: scoped lookups by shop
CREATE INDEX idx_staff_shop           ON staff (shop_id);

-- reconciliations: list by shop + date (UNIQUE already covers shop_id,cashier_id,date)
CREATE INDEX idx_recon_shop_date      ON reconciliations (shop_id, date);

-- customer_credits: outstanding-credit list filters on shop_id + is_settled
CREATE INDEX idx_credits_shop_settled ON customer_credits (shop_id, is_settled);

-- credit_transactions: ledger per credit
CREATE INDEX idx_credit_txn_credit    ON credit_transactions (credit_id);

-- audit_log: owner timeline per shop
CREATE INDEX idx_audit_shop_created   ON audit_log (shop_id, created_at);
