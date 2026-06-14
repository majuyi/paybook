-- Paybook Phase 1 — Sale logging (FRD §5)
--
-- create_sale is the critical atomic operation. In ONE transaction it:
--   1. locks each product row, validates it is active and has enough stock
--   2. inserts the sale with a SERVER-COMPUTED total (client never sends prices)
--   3. inserts denormalised sale_items (name/sell_price/cost_price captured now)
--   4. decrements stock_qty (already validated under lock — never goes < 0)
--   5. for credit sales, creates/updates customer_credits + a 'charge' txn
--   6. writes the sale.created audit row
-- Any failure raises and the whole thing rolls back (all-or-nothing, §5.2).

CREATE OR REPLACE FUNCTION public.create_sale(
  p_actor_id       uuid,
  p_payment_method text,
  p_items          jsonb,   -- [{ "product_id": uuid, "quantity": int }, ...]
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

  -- Validate + lock product rows; accumulate the server-authoritative total.
  FOR v_item IN
    SELECT agg.pid, agg.qty, p.name, p.sell_price, p.stock_qty, p.is_active
    FROM (
      SELECT (e->>'product_id')::uuid AS pid, SUM((e->>'quantity')::int) AS qty
      FROM jsonb_array_elements(p_items) e
      GROUP BY 1
    ) agg
    LEFT JOIN products p ON p.id = agg.pid AND p.shop_id = v_shop_id
    FOR UPDATE OF p
  LOOP
    IF v_item.name IS NULL OR NOT v_item.is_active THEN
      RAISE EXCEPTION 'a product in the cart is unavailable';
    END IF;
    IF v_item.qty <= 0 THEN
      RAISE EXCEPTION 'invalid quantity for %', v_item.name;
    END IF;
    IF v_item.stock_qty < v_item.qty THEN
      RAISE EXCEPTION 'insufficient stock for % (% left)', v_item.name, v_item.stock_qty;
    END IF;
    v_total := v_total + v_item.sell_price * v_item.qty;
  END LOOP;

  INSERT INTO sales (shop_id, cashier_id, total, payment_method, note)
  VALUES (v_shop_id, p_actor_id, v_total, p_payment_method,
          NULLIF(btrim(coalesce(p_note, '')), ''))
  RETURNING id INTO v_sale_id;

  -- Denormalised line items (price + name captured at sale time, §2.6).
  INSERT INTO sale_items (sale_id, product_id, product_name, sell_price, cost_price, quantity)
  SELECT v_sale_id, p.id, p.name, p.sell_price, p.cost_price, agg.qty
  FROM (
    SELECT (e->>'product_id')::uuid AS pid, SUM((e->>'quantity')::int) AS qty
    FROM jsonb_array_elements(p_items) e
    GROUP BY 1
  ) agg
  JOIN products p ON p.id = agg.pid AND p.shop_id = v_shop_id;

  -- Decrement stock (validated under lock above; cannot go negative).
  UPDATE products p
  SET stock_qty = p.stock_qty - agg.qty
  FROM (
    SELECT (e->>'product_id')::uuid AS pid, SUM((e->>'quantity')::int) AS qty
    FROM jsonb_array_elements(p_items) e
    GROUP BY 1
  ) agg
  WHERE p.id = agg.pid AND p.shop_id = v_shop_id;

  -- Credit sale: create or update the customer's running balance (§9.1).
  -- Match unsettled record null-safe + case-insensitive on (name, phone).
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

-- soft_delete_sale (§5.3): OWNER only, reason required. Sets is_deleted/
-- deleted_by/deleted_at and audits with the reason. Does NOT restore stock
-- (confirmed business rule) and does NOT touch reconciliation (§8.4).
CREATE OR REPLACE FUNCTION public.soft_delete_sale(
  p_actor_id uuid,
  p_sale_id  uuid,
  p_reason   text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_shop_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  SELECT id INTO v_shop_id FROM shops WHERE owner_id = auth.uid();
  IF v_shop_id IS NULL THEN RAISE EXCEPTION 'no shop for this owner'; END IF;

  -- Defence in depth: the actor must be the shop's owner staff (§5.3).
  IF NOT EXISTS (
    SELECT 1 FROM staff WHERE id = p_actor_id AND shop_id = v_shop_id AND role = 'owner'
  ) THEN
    RAISE EXCEPTION 'only the owner can delete a sale';
  END IF;
  IF p_reason IS NULL OR length(btrim(p_reason)) = 0 THEN
    RAISE EXCEPTION 'a reason is required to delete a sale';
  END IF;

  UPDATE sales
  SET is_deleted = true, deleted_by = p_actor_id, deleted_at = now()
  WHERE id = p_sale_id AND shop_id = v_shop_id AND is_deleted = false;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'sale not found or already deleted';
  END IF;

  INSERT INTO audit_log (shop_id, actor_id, action, entity_type, entity_id, payload)
  VALUES (v_shop_id, p_actor_id, 'sale.deleted', 'sale', p_sale_id,
          jsonb_build_object('reason', btrim(p_reason)));
END;
$$;

REVOKE ALL ON FUNCTION public.create_sale(uuid, text, jsonb, text, text, text) FROM public;
REVOKE ALL ON FUNCTION public.soft_delete_sale(uuid, uuid, text) FROM public;
GRANT EXECUTE ON FUNCTION public.create_sale(uuid, text, jsonb, text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.soft_delete_sale(uuid, uuid, text) TO authenticated;
