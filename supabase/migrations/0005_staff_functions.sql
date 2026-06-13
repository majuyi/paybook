-- Paybook Phase 1 — Staff management functions (FRD §7)
--
-- All staff mutations go through SECURITY DEFINER functions so the staff write
-- and its audit_log entry happen atomically, and audit_log (no client INSERT
-- policy) is written server-side. Every function:
--   * requires the caller to be an authenticated shop owner (auth.uid())
--   * resolves the owner's shop and owner staff row (the audit actor)
--   * confirms the target staff belongs to that shop
-- PINs are bcrypt-hashed by the server action BEFORE being passed in.

-- ============================================================
-- create_staff (§7.2): owner adds a manager/cashier. Soft cap 20 active staff.
-- ============================================================
CREATE OR REPLACE FUNCTION public.create_staff(
  p_name      text,
  p_phone     text,
  p_role      text,
  p_pin_hash  text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid      uuid := auth.uid();
  v_shop_id  uuid;
  v_actor    uuid;
  v_count    integer;
  v_staff_id uuid;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;

  SELECT id INTO v_shop_id FROM shops WHERE owner_id = v_uid;
  IF v_shop_id IS NULL THEN RAISE EXCEPTION 'no shop for this owner'; END IF;

  SELECT id INTO v_actor FROM staff
    WHERE shop_id = v_shop_id AND role = 'owner' LIMIT 1;

  IF p_role NOT IN ('manager', 'cashier') THEN
    RAISE EXCEPTION 'role must be manager or cashier';
  END IF;
  IF p_name IS NULL OR length(btrim(p_name)) = 0 THEN
    RAISE EXCEPTION 'staff name is required';
  END IF;

  -- Soft cap: at most 20 active staff (any role) per shop.
  SELECT count(*) INTO v_count FROM staff WHERE shop_id = v_shop_id AND is_active;
  IF v_count >= 20 THEN
    RAISE EXCEPTION 'staff limit reached (max 20 active accounts)';
  END IF;

  INSERT INTO staff (shop_id, name, phone, role, pin_hash)
  VALUES (v_shop_id, btrim(p_name), NULLIF(btrim(coalesce(p_phone, '')), ''), p_role, p_pin_hash)
  RETURNING id INTO v_staff_id;

  INSERT INTO audit_log (shop_id, actor_id, action, entity_type, entity_id, payload)
  VALUES (v_shop_id, v_actor, 'staff.created', 'staff', v_staff_id,
          jsonb_build_object('role', p_role, 'name', btrim(p_name)));

  RETURN v_staff_id;
END;
$$;

-- ============================================================
-- set_staff_active (§7.2): deactivate (revokes PIN access) / reactivate.
-- The owner's own record cannot be deactivated.
-- ============================================================
CREATE OR REPLACE FUNCTION public.set_staff_active(
  p_staff_id uuid,
  p_active   boolean
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid     uuid := auth.uid();
  v_shop_id uuid;
  v_actor   uuid;
  v_role    text;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;

  SELECT id INTO v_shop_id FROM shops WHERE owner_id = v_uid;
  IF v_shop_id IS NULL THEN RAISE EXCEPTION 'no shop for this owner'; END IF;

  SELECT role INTO v_role FROM staff WHERE id = p_staff_id AND shop_id = v_shop_id;
  IF v_role IS NULL THEN RAISE EXCEPTION 'staff not found in this shop'; END IF;
  IF v_role = 'owner' THEN RAISE EXCEPTION 'cannot change the owner''s active status'; END IF;

  SELECT id INTO v_actor FROM staff WHERE shop_id = v_shop_id AND role = 'owner' LIMIT 1;

  UPDATE staff SET is_active = p_active WHERE id = p_staff_id;

  INSERT INTO audit_log (shop_id, actor_id, action, entity_type, entity_id, payload)
  VALUES (v_shop_id, v_actor,
          CASE WHEN p_active THEN 'staff.reactivated' ELSE 'staff.deactivated' END,
          'staff', p_staff_id, jsonb_build_object('is_active', p_active));
END;
$$;

-- ============================================================
-- reset_staff_pin (§7.2): owner resets any staff member's PIN.
-- ============================================================
CREATE OR REPLACE FUNCTION public.reset_staff_pin(
  p_staff_id uuid,
  p_pin_hash text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid     uuid := auth.uid();
  v_shop_id uuid;
  v_actor   uuid;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;

  SELECT id INTO v_shop_id FROM shops WHERE owner_id = v_uid;
  IF v_shop_id IS NULL THEN RAISE EXCEPTION 'no shop for this owner'; END IF;

  IF NOT EXISTS (SELECT 1 FROM staff WHERE id = p_staff_id AND shop_id = v_shop_id) THEN
    RAISE EXCEPTION 'staff not found in this shop';
  END IF;

  SELECT id INTO v_actor FROM staff WHERE shop_id = v_shop_id AND role = 'owner' LIMIT 1;

  UPDATE staff SET pin_hash = p_pin_hash WHERE id = p_staff_id;

  INSERT INTO audit_log (shop_id, actor_id, action, entity_type, entity_id, payload)
  VALUES (v_shop_id, v_actor, 'staff.pin_reset', 'staff', p_staff_id, '{}'::jsonb);
END;
$$;

REVOKE ALL ON FUNCTION public.create_staff(text, text, text, text) FROM public;
REVOKE ALL ON FUNCTION public.set_staff_active(uuid, boolean) FROM public;
REVOKE ALL ON FUNCTION public.reset_staff_pin(uuid, text) FROM public;
GRANT EXECUTE ON FUNCTION public.create_staff(text, text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_staff_active(uuid, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reset_staff_pin(uuid, text) TO authenticated;
