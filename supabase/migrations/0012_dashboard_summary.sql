-- Paybook Phase 1 — in-app "today" dashboard summary (FRD §10 figures, live)
--
-- The home dashboard shows the same six metrics as the daily WhatsApp briefing,
-- but live and for *today*. briefing_data(p_shop_id, p_date) is revoked from
-- authenticated users because it takes an arbitrary shop_id. This wrapper takes
-- no arguments: it derives the shop from the caller's auth.uid() and today's
-- date in that shop's timezone, so an authenticated owner can only ever read
-- their own shop's figures.

CREATE OR REPLACE FUNCTION public.dashboard_summary()
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
  v_shop_id uuid;
  v_tz      text;
  v_today   date;
BEGIN
  SELECT id, timezone INTO v_shop_id, v_tz
  FROM shops WHERE owner_id = auth.uid();
  IF v_shop_id IS NULL THEN
    RAISE EXCEPTION 'no shop for current user';
  END IF;

  -- "Today" in the shop's own timezone, matching the briefing's date logic.
  v_today := (now() AT TIME ZONE v_tz)::date;

  -- Inside this SECURITY DEFINER function we execute as the definer, so calling
  -- briefing_data (revoked from public) is permitted. The shop_id passed is the
  -- caller's own, resolved above — never an arbitrary value from the client.
  RETURN QUERY SELECT * FROM public.briefing_data(v_shop_id, v_today);
END;
$$;

REVOKE ALL ON FUNCTION public.dashboard_summary() FROM public;
GRANT EXECUTE ON FUNCTION public.dashboard_summary() TO authenticated;
