-- Paybook Phase 1 — WhatsApp daily briefing (FRD §10)
--
-- briefing_dispatches tracks one send per shop per day so the cron can dedupe
-- and drive the "retry once after 30 minutes" rule (§10.3). Written only by the
-- service-role cron (no client write policies); owner may read their own.

CREATE TABLE briefing_dispatches (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id         uuid REFERENCES shops(id) ON DELETE CASCADE,
  date            date NOT NULL,
  status          text NOT NULL CHECK (status IN ('sent', 'pending_retry', 'failed')),
  attempts        integer NOT NULL DEFAULT 0,
  last_attempt_at timestamptz,
  sent_at         timestamptz,
  error           text,
  created_at      timestamptz DEFAULT now(),
  UNIQUE (shop_id, date)
);

ALTER TABLE briefing_dispatches ENABLE ROW LEVEL SECURITY;

CREATE POLICY briefing_dispatches_select ON briefing_dispatches
  FOR SELECT TO authenticated
  USING (current_user_owns_shop(shop_id));
-- No client INSERT/UPDATE/DELETE: the cron writes via the service-role key.

CREATE INDEX idx_briefing_shop_date ON briefing_dispatches (shop_id, date);

-- briefing_data: all six §10.2 metrics for a shop on a date (date evaluated in
-- the shop's timezone). Called by the cron with the service-role key; not
-- granted to authenticated users (no arbitrary shop_id access).
CREATE OR REPLACE FUNCTION public.briefing_data(p_shop_id uuid, p_date date)
RETURNS TABLE (
  total_revenue    numeric,
  estimated_profit numeric,
  sale_count       integer,
  cash_status      text,
  low_stock        jsonb,
  low_stock_more   integer,
  credit_count     integer,
  credit_total     numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tz        text;
  v_status    text;
  n_recon     integer;
  n_cashiers  integer;
  n_done      integer;
BEGIN
  SELECT timezone INTO v_tz FROM shops WHERE id = p_shop_id;
  IF v_tz IS NULL THEN RAISE EXCEPTION 'shop not found'; END IF;

  -- Cash status (§10.2)
  SELECT count(*) INTO n_recon
  FROM reconciliations WHERE shop_id = p_shop_id AND date = p_date;

  SELECT count(DISTINCT s.cashier_id) INTO n_cashiers
  FROM sales s
  WHERE s.shop_id = p_shop_id AND s.is_deleted = false
    AND (s.sold_at AT TIME ZONE v_tz)::date = p_date;

  SELECT count(*) INTO n_done
  FROM (
    SELECT DISTINCT s.cashier_id
    FROM sales s
    WHERE s.shop_id = p_shop_id AND s.is_deleted = false
      AND (s.sold_at AT TIME ZONE v_tz)::date = p_date
  ) dc
  WHERE EXISTS (
    SELECT 1 FROM reconciliations r
    WHERE r.shop_id = p_shop_id AND r.date = p_date
      AND r.cashier_id = dc.cashier_id AND r.completed_at IS NOT NULL
  );

  IF n_recon = 0 THEN
    v_status := 'Not started';
  ELSIF n_cashiers > 0 AND n_done = n_cashiers THEN
    v_status := 'Reconciled';
  ELSE
    v_status := 'Pending';
  END IF;

  RETURN QUERY
  SELECT
    coalesce((
      SELECT sum(s.total) FROM sales s
      WHERE s.shop_id = p_shop_id AND s.is_deleted = false
        AND (s.sold_at AT TIME ZONE v_tz)::date = p_date
    ), 0)::numeric,
    coalesce((
      SELECT sum((si.sell_price - si.cost_price) * si.quantity)
      FROM sale_items si JOIN sales s ON s.id = si.sale_id
      WHERE s.shop_id = p_shop_id AND s.is_deleted = false
        AND si.cost_price IS NOT NULL
        AND (s.sold_at AT TIME ZONE v_tz)::date = p_date
    ), 0)::numeric,
    coalesce((
      SELECT count(*) FROM sales s
      WHERE s.shop_id = p_shop_id AND s.is_deleted = false
        AND (s.sold_at AT TIME ZONE v_tz)::date = p_date
    ), 0)::integer,
    v_status,
    coalesce((
      SELECT jsonb_agg(jsonb_build_object('name', t.name, 'qty', t.stock_qty))
      FROM (
        SELECT p.name, p.stock_qty FROM products p
        WHERE p.shop_id = p_shop_id AND p.is_active
          AND p.stock_qty <= p.low_stock_threshold
        ORDER BY p.stock_qty ASC LIMIT 5
      ) t
    ), '[]'::jsonb),
    greatest((
      SELECT count(*)::integer FROM products p
      WHERE p.shop_id = p_shop_id AND p.is_active
        AND p.stock_qty <= p.low_stock_threshold
    ) - 5, 0),
    coalesce((
      SELECT count(*) FROM customer_credits
      WHERE shop_id = p_shop_id AND is_settled = false
    ), 0)::integer,
    coalesce((
      SELECT sum(amount_owed) FROM customer_credits
      WHERE shop_id = p_shop_id AND is_settled = false
    ), 0)::numeric;
END;
$$;

REVOKE ALL ON FUNCTION public.briefing_data(uuid, date) FROM public;
