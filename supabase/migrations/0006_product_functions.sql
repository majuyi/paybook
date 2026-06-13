-- Paybook Phase 1 — Inventory functions (FRD §6)
--
-- Actor-aware: p_actor_id is the resolved active staff (owner or manager) that
-- the server action validated. Role enforcement (cashier cannot edit; only the
-- owner may set cost_price) happens in the server-action layer; these functions
-- enforce the shop boundary and audit every change.
--
-- stock_qty is NEVER changed by create/update_product — stock only moves through
-- adjust_stock, which requires a reason and records before/after qty (§6.2).

-- create_product (§6.1): owner/manager add a product.
CREATE OR REPLACE FUNCTION public.create_product(
  p_actor_id            uuid,
  p_name                text,
  p_category            text,
  p_sell_price          numeric,
  p_cost_price          numeric,
  p_stock_qty           integer,
  p_low_stock_threshold integer
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_shop_id uuid;
  v_id      uuid;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  SELECT id INTO v_shop_id FROM shops WHERE owner_id = auth.uid();
  IF v_shop_id IS NULL THEN RAISE EXCEPTION 'no shop for this owner'; END IF;
  IF NOT EXISTS (SELECT 1 FROM staff WHERE id = p_actor_id AND shop_id = v_shop_id AND is_active) THEN
    RAISE EXCEPTION 'actor is not active staff of this shop';
  END IF;

  IF p_name IS NULL OR length(btrim(p_name)) = 0 THEN RAISE EXCEPTION 'name is required'; END IF;
  IF p_sell_price IS NULL OR p_sell_price < 0 THEN RAISE EXCEPTION 'sell price must be >= 0'; END IF;
  IF coalesce(p_stock_qty, 0) < 0 THEN RAISE EXCEPTION 'stock cannot be negative'; END IF;
  IF coalesce(p_low_stock_threshold, 5) < 0 THEN RAISE EXCEPTION 'threshold cannot be negative'; END IF;

  INSERT INTO products (shop_id, name, category, sell_price, cost_price, stock_qty, low_stock_threshold)
  VALUES (v_shop_id, btrim(p_name), NULLIF(btrim(coalesce(p_category, '')), ''),
          p_sell_price, p_cost_price, coalesce(p_stock_qty, 0), coalesce(p_low_stock_threshold, 5))
  RETURNING id INTO v_id;

  INSERT INTO audit_log (shop_id, actor_id, action, entity_type, entity_id, payload)
  VALUES (v_shop_id, p_actor_id, 'product.created', 'product', v_id,
          jsonb_build_object('name', btrim(p_name), 'sell_price', p_sell_price, 'stock_qty', coalesce(p_stock_qty, 0)));

  RETURN v_id;
END;
$$;

-- update_product (§6.1): edit product details. cost_price only applied when the
-- server says so (p_apply_cost = true, i.e. owner). Never touches stock_qty.
CREATE OR REPLACE FUNCTION public.update_product(
  p_actor_id            uuid,
  p_product_id          uuid,
  p_name                text,
  p_category            text,
  p_sell_price          numeric,
  p_low_stock_threshold integer,
  p_cost_price          numeric,
  p_apply_cost          boolean
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
  IF NOT EXISTS (SELECT 1 FROM products WHERE id = p_product_id AND shop_id = v_shop_id) THEN
    RAISE EXCEPTION 'product not found in this shop';
  END IF;
  IF p_name IS NULL OR length(btrim(p_name)) = 0 THEN RAISE EXCEPTION 'name is required'; END IF;
  IF p_sell_price IS NULL OR p_sell_price < 0 THEN RAISE EXCEPTION 'sell price must be >= 0'; END IF;

  UPDATE products SET
    name = btrim(p_name),
    category = NULLIF(btrim(coalesce(p_category, '')), ''),
    sell_price = p_sell_price,
    low_stock_threshold = coalesce(p_low_stock_threshold, low_stock_threshold),
    cost_price = CASE WHEN p_apply_cost THEN p_cost_price ELSE cost_price END
  WHERE id = p_product_id;

  INSERT INTO audit_log (shop_id, actor_id, action, entity_type, entity_id, payload)
  VALUES (v_shop_id, p_actor_id, 'product.updated', 'product', p_product_id,
          jsonb_build_object('name', btrim(p_name), 'sell_price', p_sell_price));
END;
$$;

-- set_product_active (§6.2): no hard delete — deactivate/reactivate instead.
CREATE OR REPLACE FUNCTION public.set_product_active(
  p_actor_id   uuid,
  p_product_id uuid,
  p_active     boolean
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
  IF NOT EXISTS (SELECT 1 FROM products WHERE id = p_product_id AND shop_id = v_shop_id) THEN
    RAISE EXCEPTION 'product not found in this shop';
  END IF;

  UPDATE products SET is_active = p_active WHERE id = p_product_id;

  INSERT INTO audit_log (shop_id, actor_id, action, entity_type, entity_id, payload)
  VALUES (v_shop_id, p_actor_id,
          CASE WHEN p_active THEN 'product.reactivated' ELSE 'product.deactivated' END,
          'product', p_product_id, jsonb_build_object('is_active', p_active));
END;
$$;

-- adjust_stock (§6.2): manual stock change with a required reason; audits
-- before/after qty. Resulting stock cannot go negative.
CREATE OR REPLACE FUNCTION public.adjust_stock(
  p_actor_id   uuid,
  p_product_id uuid,
  p_new_qty    integer,
  p_reason     text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_shop_id uuid;
  v_before  integer;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  SELECT id INTO v_shop_id FROM shops WHERE owner_id = auth.uid();
  IF v_shop_id IS NULL THEN RAISE EXCEPTION 'no shop for this owner'; END IF;
  IF p_new_qty IS NULL OR p_new_qty < 0 THEN RAISE EXCEPTION 'new quantity must be >= 0'; END IF;
  IF p_reason IS NULL OR length(btrim(p_reason)) = 0 THEN RAISE EXCEPTION 'reason is required'; END IF;

  SELECT stock_qty INTO v_before FROM products WHERE id = p_product_id AND shop_id = v_shop_id;
  IF v_before IS NULL THEN RAISE EXCEPTION 'product not found in this shop'; END IF;

  UPDATE products SET stock_qty = p_new_qty WHERE id = p_product_id;

  INSERT INTO audit_log (shop_id, actor_id, action, entity_type, entity_id, payload)
  VALUES (v_shop_id, p_actor_id, 'stock.adjusted', 'product', p_product_id,
          jsonb_build_object('before', v_before, 'after', p_new_qty, 'reason', btrim(p_reason)));
END;
$$;

REVOKE ALL ON FUNCTION public.create_product(uuid, text, text, numeric, numeric, integer, integer) FROM public;
REVOKE ALL ON FUNCTION public.update_product(uuid, uuid, text, text, numeric, integer, numeric, boolean) FROM public;
REVOKE ALL ON FUNCTION public.set_product_active(uuid, uuid, boolean) FROM public;
REVOKE ALL ON FUNCTION public.adjust_stock(uuid, uuid, integer, text) FROM public;
GRANT EXECUTE ON FUNCTION public.create_product(uuid, text, text, numeric, numeric, integer, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_product(uuid, uuid, text, text, numeric, integer, numeric, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_product_active(uuid, uuid, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.adjust_stock(uuid, uuid, integer, text) TO authenticated;
