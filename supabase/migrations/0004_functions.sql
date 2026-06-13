-- Paybook Phase 1 — Server-side functions (atomic multi-table writes)
--
-- Pattern: multi-table writes that must be all-or-nothing (and writes to
-- audit_log, which has no client INSERT policy) go through SECURITY DEFINER
-- functions. This establishes the approach we'll reuse for sale logging (§5.2,
-- "stock decrement MUST be atomic"), credit, etc.

-- ============================================================
-- create_shop_with_owner
-- Onboarding (§4): create the shop, auto-create the owner's staff record, and
-- audit it — atomically. The PIN is bcrypt-hashed by the server action BEFORE
-- being passed in; plaintext never reaches the database.
-- ============================================================
CREATE OR REPLACE FUNCTION public.create_shop_with_owner(
  p_name        text,
  p_whatsapp    text,
  p_owner_name  text,
  p_pin_hash    text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid      uuid := auth.uid();
  v_shop_id  uuid;
  v_staff_id uuid;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;

  IF EXISTS (SELECT 1 FROM shops WHERE owner_id = v_uid) THEN
    RAISE EXCEPTION 'shop already exists for this owner';
  END IF;

  IF p_name IS NULL OR length(btrim(p_name)) = 0 THEN
    RAISE EXCEPTION 'shop name is required';
  END IF;
  IF p_whatsapp IS NULL OR length(btrim(p_whatsapp)) = 0 THEN
    RAISE EXCEPTION 'whatsapp number is required';
  END IF;

  INSERT INTO shops (name, owner_id, whatsapp_number)
  VALUES (btrim(p_name), v_uid, btrim(p_whatsapp))
  RETURNING id INTO v_shop_id;

  INSERT INTO staff (shop_id, name, role, pin_hash)
  VALUES (v_shop_id, btrim(p_owner_name), 'owner', p_pin_hash)
  RETURNING id INTO v_staff_id;

  INSERT INTO audit_log (shop_id, actor_id, action, entity_type, entity_id, payload)
  VALUES
    (v_shop_id, v_staff_id, 'shop.created', 'shop', v_shop_id,
     jsonb_build_object('name', btrim(p_name))),
    (v_shop_id, v_staff_id, 'staff.created', 'staff', v_staff_id,
     jsonb_build_object('role', 'owner', 'name', btrim(p_owner_name)));

  RETURN v_shop_id;
END;
$$;

-- Only authenticated users may call it; SECURITY DEFINER handles the rest.
REVOKE ALL ON FUNCTION public.create_shop_with_owner(text, text, text, text) FROM public;
GRANT EXECUTE ON FUNCTION public.create_shop_with_owner(text, text, text, text) TO authenticated;
