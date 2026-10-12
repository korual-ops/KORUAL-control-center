-- KORUAL atomic Partner quote v1.
-- Staging proposal: intentionally NOT deployed to the production Supabase project.
-- Prerequisite: partner_memberships migration and existing marketplace tables.
--
-- Uses one PostgreSQL transaction and a row lock on the service request.
-- This prevents new quotes from crossing a concurrent terminal-state change.
-- IMPORTANT: SECURITY INVOKER; execute permission is for service_role only.
-- The API must authenticate the user and never accept actor identity from JSON.

CREATE OR REPLACE FUNCTION public.submit_partner_quote_v1(
  p_actor_id uuid,
  p_provider_id uuid,
  p_request_id uuid,
  p_amount integer,
  p_duration integer,
  p_warranty integer,
  p_message text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  v_eligible boolean;
  v_status text;
  v_desired_date date;
  v_match_status text;
  v_existing public.provider_quotes%ROWTYPE;
  v_created public.provider_quotes%ROWTYPE;
  v_now timestamptz := now();
BEGIN
  IF p_actor_id IS NULL OR p_provider_id IS NULL OR p_request_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'INVALID_ID');
  END IF;
  IF p_amount IS NULL OR p_amount < 1000 OR p_amount > 100000000
    OR p_message IS NULL OR length(btrim(p_message)) < 1 OR length(p_message) > 600
    OR (p_duration IS NOT NULL AND (p_duration < 1 OR p_duration > 10080))
    OR (p_warranty IS NOT NULL AND (p_warranty < 0 OR p_warranty > 3650))
  THEN
    RETURN jsonb_build_object('ok', false, 'error', 'INVALID_QUOTE');
  END IF;

  SELECT EXISTS(
    SELECT 1 FROM public.partner_memberships m
    JOIN public.profiles account ON account.id = m.user_id
    JOIN public.providers provider ON provider.id = m.provider_id
    WHERE m.user_id = p_actor_id AND m.provider_id = p_provider_id
      AND m.active = true AND m.role IN ('OWNER', 'OPERATOR')
      AND account.active = true
      AND provider.active = true AND provider.verified = true AND provider.is_demo = false
  ) INTO v_eligible;

  IF NOT v_eligible THEN
    RETURN jsonb_build_object('ok', false, 'error', 'PARTNER_ACCESS_DENIED');
  END IF;

  -- Lock request before checking the state and writing quote + assignment.
  -- Updates to the same request row are serialized across transactions.
  SELECT status,desired_date INTO v_status,v_desired_date FROM public.service_requests
    WHERE id = p_request_id FOR UPDATE;
  IF NOT FOUND OR v_status NOT IN ('NEW', 'MATCHING', 'QUOTED') THEN
    RETURN jsonb_build_object('ok', false, 'error', 'REQUEST_CLOSED');
  END IF;

  IF v_desired_date < (now() AT TIME ZONE 'Asia/Seoul')::date THEN
    RETURN jsonb_build_object('ok',false,'error','REQUEST_DATE_PASSED');
  END IF;

  SELECT status INTO v_match_status FROM public.service_request_matches
    WHERE request_id = p_request_id AND provider_id = p_provider_id FOR UPDATE;
  IF NOT FOUND OR v_match_status NOT IN ('pending', 'contacted', 'quoted') THEN
    RETURN jsonb_build_object('ok', false, 'error', 'LEAD_NOT_ASSIGNED');
  END IF;

  SELECT * INTO v_existing FROM public.provider_quotes
    WHERE request_id = p_request_id AND provider_id = p_provider_id FOR UPDATE;
  IF FOUND THEN
    IF v_existing.status = 'submitted'
      AND v_existing.amount = p_amount
      AND v_existing.message IS NOT DISTINCT FROM btrim(p_message)
      AND v_existing.estimated_duration_minutes IS NOT DISTINCT FROM p_duration
      AND v_existing.warranty_days IS NOT DISTINCT FROM p_warranty
    THEN
      RETURN jsonb_build_object(
        'ok', true, 'idempotent', true,
        'quote', jsonb_build_object(
          'id', v_existing.id, 'request_id', v_existing.request_id,
          'amount', v_existing.amount, 'status', v_existing.status,
          'created_at', v_existing.created_at, 'quote_expires_at', v_existing.quote_expires_at
        )
      );
    END IF;
    RETURN jsonb_build_object('ok', false, 'error', 'QUOTE_ALREADY_EXISTS');
  END IF;

  INSERT INTO public.provider_quotes(
    provider_id, request_id, amount, estimated_duration_minutes,
    warranty_days, message, status, quote_expires_at, quote_snapshot
  ) VALUES (
    p_provider_id, p_request_id, p_amount, p_duration, p_warranty,
    btrim(p_message), 'submitted', v_now + interval '48 hours',
    jsonb_build_object('source', 'korual_partner_portal', 'version', '2.0', 'submitted_by', p_actor_id)
  ) RETURNING * INTO v_created;

  UPDATE public.service_request_matches
    SET status = 'quoted', responded_at = v_now, updated_at = v_now
    WHERE request_id = p_request_id AND provider_id = p_provider_id;
  UPDATE public.service_requests
    SET status = 'QUOTED', updated_at = v_now
    WHERE id = p_request_id AND status IN ('NEW', 'MATCHING');

  RETURN jsonb_build_object(
    'ok', true, 'idempotent', false,
    'quote', jsonb_build_object(
      'id', v_created.id, 'request_id', v_created.request_id,
      'amount', v_created.amount, 'status', v_created.status,
      'created_at', v_created.created_at, 'quote_expires_at', v_created.quote_expires_at
    )
  );
END;
$$;

REVOKE ALL ON FUNCTION public.submit_partner_quote_v1(
 uuid,uuid,uuid,integer,integer,integer,text
) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.submit_partner_quote_v1(
 uuid,uuid,uuid,integer,integer,integer,text
) TO service_role;
