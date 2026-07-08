DO $$
DECLARE
  v_market uuid := 'd190ab63-e399-4ee8-9c02-5ea05570386e';
  v_admin  uuid := '872fa080-c08c-490c-aa89-dfba258be987';
  v_claimed uuid;
  r record;
  v_newbal numeric;
  v_bets int := 0;
  v_total numeric := 0;
  v_title text;
BEGIN
  SELECT title INTO v_title FROM markets WHERE id = v_market;
  UPDATE markets SET status='cancelled'
    WHERE id=v_market AND status IN ('open','closed','suspended')
    RETURNING id INTO v_claimed;
  IF v_claimed IS NULL THEN RAISE EXCEPTION 'claim failed (already cancelled/settled)'; END IF;
  FOR r IN SELECT id, user_id, amount FROM bets WHERE market_id=v_market AND status='active' LOOP
    UPDATE bets SET status='cancelled' WHERE id=r.id AND status='active';
    v_newbal := adjust_wallet_balance(r.user_id, r.amount);
    INSERT INTO transactions(user_id,type,amount,balance_after,status,metadata)
    VALUES (r.user_id,'refund',r.amount,v_newbal,'completed',
      jsonb_build_object('marketId',v_market::text,'market_title',v_title,'reason','admin_takedown'));
    v_bets := v_bets + 1;
    v_total := v_total + r.amount;
  END LOOP;
  INSERT INTO audit_log(entity_type,action,entity_id,actor_id,actor_type,payload)
  VALUES ('market','admin_takedown',v_market,v_admin,'admin',
    jsonb_build_object('reason','admin_takedown','refunded_bets',v_bets,'refunded_total',v_total));
  RAISE NOTICE 'takedown ok: % bets, UGX % refunded', v_bets, v_total;
END $$;
