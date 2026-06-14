-- Paybook Phase 1 — Customer credit payments (FRD §9)
--
-- Charges are created during sale logging (create_sale). This adds payment
-- recording: decrement amount_owed, log a 'payment' transaction, settle at zero.
-- Overpayment is blocked (§9.2: amount_owed must never go below 0).

CREATE OR REPLACE FUNCTION public.record_payment(
  p_actor_id uuid,
  p_credit_id uuid,
  p_amount    numeric
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_shop_id uuid;
  v_owed    numeric(12,2);
  v_new     numeric(12,2);
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  SELECT id INTO v_shop_id FROM shops WHERE owner_id = auth.uid();
  IF v_shop_id IS NULL THEN RAISE EXCEPTION 'no shop for this owner'; END IF;

  -- §7.1: owner or manager manage credit (cashier is log-only).
  IF NOT EXISTS (
    SELECT 1 FROM staff
    WHERE id = p_actor_id AND shop_id = v_shop_id AND role IN ('owner', 'manager')
  ) THEN
    RAISE EXCEPTION 'only owner or manager can record a payment';
  END IF;
  IF p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'payment amount must be greater than 0';
  END IF;

  -- Lock the credit row while we adjust the balance.
  SELECT amount_owed INTO v_owed
  FROM customer_credits
  WHERE id = p_credit_id AND shop_id = v_shop_id
  FOR UPDATE;
  IF v_owed IS NULL THEN RAISE EXCEPTION 'credit record not found in this shop'; END IF;

  IF p_amount > v_owed THEN
    RAISE EXCEPTION 'payment of % exceeds the outstanding balance of %', p_amount, v_owed;
  END IF;

  v_new := v_owed - p_amount;

  UPDATE customer_credits
  SET amount_owed = v_new,
      last_payment_at = now(),
      is_settled = (v_new = 0)
  WHERE id = p_credit_id;

  INSERT INTO credit_transactions (credit_id, type, amount, note, recorded_by)
  VALUES (p_credit_id, 'payment', p_amount, 'Payment', p_actor_id);

  INSERT INTO audit_log (shop_id, actor_id, action, entity_type, entity_id, payload)
  VALUES (v_shop_id, p_actor_id, 'credit.payment', 'customer_credit', p_credit_id,
          jsonb_build_object('amount', p_amount, 'balance', v_new, 'settled', v_new = 0));
END;
$$;

REVOKE ALL ON FUNCTION public.record_payment(uuid, uuid, numeric) FROM public;
GRANT EXECUTE ON FUNCTION public.record_payment(uuid, uuid, numeric) TO authenticated;
