-- Paybook Phase 1 — fix create_sale (FRD §5)
--
-- The original used `LEFT JOIN products ... FOR UPDATE OF p`, but Postgres
-- forbids FOR UPDATE on the nullable side of an outer join. Switch to an INNER
-- JOIN (also filtered to active products) and detect unavailable/inactive
-- products by comparing the number of locked rows to the number requested.

CREATE OR REPLACE FUNCTION public.create_sale(
  p_actor_id       uuid,
  p_payment_method text,
  p_items          jsonb,
  p_customer_name  text,
  p_customer_phone text,
  p_note           text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_shop_id   uuid;
  v_total     numeric(12,2) := 0;
  v_sale_id   uuid;
  v_credit_id uuid;
  v_phone     text := NULLIF(btrim(coalesce(p_customer_phone, '')), '');
  v_requested integer;
  v_seen      integer := 0;
  v_item      record;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  SELECT id INTO v_shop_id FROM shops WHERE owner_id = auth.uid();
  IF v_shop_id IS NULL THEN RAISE EXCEPTION 'no shop for this owner'; END IF;
  IF NOT EXISTS (SELECT 1 FROM staff WHERE id = p_actor_id AND shop_id = v_shop_id AND is_active) THEN
    RAISE EXCEPTION 'actor is not active staff of this shop';
  END IF;
  IF p_payment_method NOT IN ('cash', 'transfer', 'pos', 'credit') THEN
    RAISE EXCEPTION 'invalid payment method';
  END IF;
  IF p_items IS NULL OR jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'sale has no items';
  END IF;
  IF p_payment_method = 'credit'
     AND (p_customer_name IS NULL OR length(btrim(p_customer_name)) = 0) THEN
    RAISE EXCEPTION 'customer name is required for a credit sale';
  END IF;

  SELECT count(DISTINCT (e->>'product_id')) INTO v_requested
  FROM jsonb_array_elements(p_items) e;

  -- Lock active product rows, validate stock, accumulate server-side total.
  FOR v_item IN
    SELECT agg.pid, agg.qty, p.name, p.sell_price, p.stock_qty
    FROM (
      SELECT (e->>'product_id')::uuid AS pid, SUM((e->>'quantity')::int) AS qty
      FROM jsonb_array_elements(p_items) e
      GROUP BY 1
    ) agg
    JOIN products p ON p.id = agg.pid AND p.shop_id = v_shop_id AND p.is_active
    FOR UPDATE OF p
  LOOP
    v_seen := v_seen + 1;
    IF v_item.qty <= 0 THEN
      RAISE EXCEPTION 'invalid quantity for %', v_item.name;
    END IF;
    IF v_item.stock_qty < v_item.qty THEN
      RAISE EXCEPTION 'insufficient stock for % (% left)', v_item.name, v_item.stock_qty;
    END IF;
    v_total := v_total + v_item.sell_price * v_item.qty;
  END LOOP;

  IF v_seen <> v_requested THEN
    RAISE EXCEPTION 'a product in the cart is unavailable';
  END IF;

  INSERT INTO sales (shop_id, cashier_id, total, payment_method, note)
  VALUES (v_shop_id, p_actor_id, v_total, p_payment_method,
          NULLIF(btrim(coalesce(p_note, '')), ''))
  RETURNING id INTO v_sale_id;

  INSERT INTO sale_items (sale_id, product_id, product_name, sell_price, cost_price, quantity)
  SELECT v_sale_id, p.id, p.name, p.sell_price, p.cost_price, agg.qty
  FROM (
    SELECT (e->>'product_id')::uuid AS pid, SUM((e->>'quantity')::int) AS qty
    FROM jsonb_array_elements(p_items) e
    GROUP BY 1
  ) agg
  JOIN products p ON p.id = agg.pid AND p.shop_id = v_shop_id;

  UPDATE products p
  SET stock_qty = p.stock_qty - agg.qty
  FROM (
    SELECT (e->>'product_id')::uuid AS pid, SUM((e->>'quantity')::int) AS qty
    FROM jsonb_array_elements(p_items) e
    GROUP BY 1
  ) agg
  WHERE p.id = agg.pid AND p.shop_id = v_shop_id;

  IF p_payment_method = 'credit' THEN
    SELECT id INTO v_credit_id
    FROM customer_credits
    WHERE shop_id = v_shop_id
      AND is_settled = false
      AND lower(btrim(customer_name)) = lower(btrim(p_customer_name))
      AND coalesce(customer_phone, '') = coalesce(v_phone, '')
    LIMIT 1;

    IF v_credit_id IS NULL THEN
      INSERT INTO customer_credits (shop_id, customer_name, customer_phone, amount_owed)
      VALUES (v_shop_id, btrim(p_customer_name), v_phone, v_total)
      RETURNING id INTO v_credit_id;
    ELSE
      UPDATE customer_credits SET amount_owed = amount_owed + v_total WHERE id = v_credit_id;
    END IF;

    INSERT INTO credit_transactions (credit_id, type, amount, note, recorded_by)
    VALUES (v_credit_id, 'charge', v_total, 'Credit sale', p_actor_id);
  END IF;

  INSERT INTO audit_log (shop_id, actor_id, action, entity_type, entity_id, payload)
  VALUES (v_shop_id, p_actor_id, 'sale.created', 'sale', v_sale_id,
          jsonb_build_object('total', v_total, 'payment_method', p_payment_method));

  RETURN v_sale_id;
END;
$$;
