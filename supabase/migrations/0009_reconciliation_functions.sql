-- Paybook Phase 1 — Reconciliation (FRD §8)
--
-- expected_cash counts ONLY non-deleted cash sales for the cashier on the
-- target date, where "date" is evaluated in the SHOP's timezone (§8.2 + §10.3).
-- Completion snapshots expected_cash so a later sale deletion does not change a
-- completed reconciliation (§8.4). Cashiers have no access (gated in the action).

-- reconciliation_overview: per-cashier figures for a date — live sale
-- breakdown plus any existing reconciliation row.
CREATE OR REPLACE FUNCTION public.reconciliation_overview(p_date date)
RETURNS TABLE (
  cashier_id          uuid,
  cashier_name        text,
  sales_count         integer,
  cash_total          numeric,
  transfer_total      numeric,
  pos_total           numeric,
  credit_total        numeric,
  recon_actual        numeric,
  recon_expected      numeric,
  recon_discrepancy   numeric,
  recon_completed_at  timestamptz,
  completed_by_name   text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_shop_id uuid;
  v_tz      text;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  SELECT id, timezone INTO v_shop_id, v_tz FROM shops WHERE owner_id = auth.uid();
  IF v_shop_id IS NULL THEN RAISE EXCEPTION 'no shop for this owner'; END IF;

  RETURN QUERY
  WITH day_sales AS (
    SELECT s.cashier_id, s.total, s.payment_method
    FROM sales s
    WHERE s.shop_id = v_shop_id
      AND s.is_deleted = false
      AND (s.sold_at AT TIME ZONE v_tz)::date = p_date
  ),
  agg AS (
    SELECT
      ds.cashier_id AS cid,
      count(*)::integer AS n,
      coalesce(sum(ds.total) FILTER (WHERE ds.payment_method = 'cash'), 0) AS cash,
      coalesce(sum(ds.total) FILTER (WHERE ds.payment_method = 'transfer'), 0) AS transfer,
      coalesce(sum(ds.total) FILTER (WHERE ds.payment_method = 'pos'), 0) AS pos,
      coalesce(sum(ds.total) FILTER (WHERE ds.payment_method = 'credit'), 0) AS credit
    FROM day_sales ds
    GROUP BY ds.cashier_id
  )
  SELECT
    a.cid, st.name, a.n, a.cash, a.transfer, a.pos, a.credit,
    r.actual_cash, r.expected_cash, r.discrepancy, r.completed_at, cb.name
  FROM agg a
  JOIN staff st ON st.id = a.cid
  LEFT JOIN reconciliations r
    ON r.shop_id = v_shop_id AND r.cashier_id = a.cid AND r.date = p_date
  LEFT JOIN staff cb ON cb.id = r.completed_by
  ORDER BY st.name;
END;
$$;

-- complete_reconciliation: snapshot expected_cash, record actual, lock the row.
CREATE OR REPLACE FUNCTION public.complete_reconciliation(
  p_actor_id    uuid,
  p_cashier_id  uuid,
  p_date        date,
  p_actual_cash numeric
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_shop_id  uuid;
  v_tz       text;
  v_expected numeric(12,2);
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  SELECT id, timezone INTO v_shop_id, v_tz FROM shops WHERE owner_id = auth.uid();
  IF v_shop_id IS NULL THEN RAISE EXCEPTION 'no shop for this owner'; END IF;

  -- §7.1: owner or manager only.
  IF NOT EXISTS (
    SELECT 1 FROM staff
    WHERE id = p_actor_id AND shop_id = v_shop_id AND role IN ('owner', 'manager')
  ) THEN
    RAISE EXCEPTION 'only owner or manager can complete reconciliation';
  END IF;
  IF p_actual_cash IS NULL OR p_actual_cash < 0 THEN
    RAISE EXCEPTION 'actual cash must be 0 or more';
  END IF;

  -- §8.4: once completed, cannot be edited.
  IF EXISTS (
    SELECT 1 FROM reconciliations
    WHERE shop_id = v_shop_id AND cashier_id = p_cashier_id AND date = p_date
      AND completed_at IS NOT NULL
  ) THEN
    RAISE EXCEPTION 'reconciliation already completed for this cashier and date';
  END IF;

  -- Snapshot expected cash (non-deleted cash sales, shop timezone).
  SELECT coalesce(sum(s.total), 0) INTO v_expected
  FROM sales s
  WHERE s.shop_id = v_shop_id
    AND s.cashier_id = p_cashier_id
    AND s.payment_method = 'cash'
    AND s.is_deleted = false
    AND (s.sold_at AT TIME ZONE v_tz)::date = p_date;

  INSERT INTO reconciliations (shop_id, cashier_id, date, expected_cash, actual_cash, completed_by, completed_at)
  VALUES (v_shop_id, p_cashier_id, p_date, v_expected, p_actual_cash, p_actor_id, now())
  ON CONFLICT (shop_id, cashier_id, date) DO UPDATE
    SET expected_cash = excluded.expected_cash,
        actual_cash   = excluded.actual_cash,
        completed_by  = excluded.completed_by,
        completed_at  = excluded.completed_at;

  INSERT INTO audit_log (shop_id, actor_id, action, entity_type, entity_id, payload)
  VALUES (v_shop_id, p_actor_id, 'reconciliation.completed', 'reconciliation', p_cashier_id,
          jsonb_build_object('date', p_date, 'expected', v_expected, 'actual', p_actual_cash,
                             'discrepancy', p_actual_cash - v_expected));
END;
$$;

REVOKE ALL ON FUNCTION public.reconciliation_overview(date) FROM public;
REVOKE ALL ON FUNCTION public.complete_reconciliation(uuid, uuid, date, numeric) FROM public;
GRANT EXECUTE ON FUNCTION public.reconciliation_overview(date) TO authenticated;
GRANT EXECUTE ON FUNCTION public.complete_reconciliation(uuid, uuid, date, numeric) TO authenticated;
