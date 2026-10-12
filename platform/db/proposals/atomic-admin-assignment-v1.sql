-- KORUAL atomic operator-approved lead assignment v1
-- STAGING proposal, NOT live. Requires partner_memberships and marketplace tables.
-- The same request row lock as submit_partner_quote_v1 serializes assignment
-- against a terminal request status or a concurrent quote submission.
-- This RPC deliberately accepts at most three already ranked provider ids.
-- API MUST derive actor id from a verified cookie and rank suppliers on server.
CREATE OR REPLACE FUNCTION public.assign_partner_leads_v1(
  p_actor_id uuid,
  p_request_id uuid,
  p_provider_ids uuid[],
  p_scores integer[]
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  v_status text;
  v_desired_date date;
  v_count integer;
  v_eligible integer;
  v_inserted integer;
  v_ids jsonb;
BEGIN
  IF p_actor_id IS NULL OR p_request_id IS NULL OR
     p_provider_ids IS NULL OR p_scores IS NULL OR
     coalesce(array_length(p_provider_ids,1),0) NOT BETWEEN 1 AND 3 OR
     coalesce(array_length(p_scores,1),0) <> array_length(p_provider_ids,1)
  THEN
    RETURN jsonb_build_object('ok',false,'error','INVALID_ASSIGNMENT');
  END IF;

  SELECT count(DISTINCT candidate.id) INTO v_count
    FROM unnest(p_provider_ids) AS candidate(id);
  IF v_count <> array_length(p_provider_ids,1) OR EXISTS (
    SELECT 1 FROM unnest(p_scores) AS score
      WHERE score IS NULL OR score NOT BETWEEN 0 AND 100
  ) THEN
    RETURN jsonb_build_object('ok',false,'error','INVALID_ASSIGNMENT');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.profiles
      WHERE id=p_actor_id AND active=true AND role='ADMIN'
  ) THEN
    RETURN jsonb_build_object('ok',false,'error','ADMIN_ONLY');
  END IF;

  SELECT status,desired_date INTO v_status,v_desired_date FROM public.service_requests
    WHERE id=p_request_id FOR UPDATE;
  IF NOT FOUND OR v_status NOT IN ('NEW','MATCHING','QUOTED') THEN
    RETURN jsonb_build_object('ok',false,'error','REQUEST_CLOSED');
  END IF;

  IF v_desired_date < (now() AT TIME ZONE 'Asia/Seoul')::date THEN
    RETURN jsonb_build_object('ok',false,'error','REQUEST_DATE_PASSED');
  END IF;

  SELECT count(*) INTO v_eligible
    FROM public.providers p
    WHERE p.id = ANY(p_provider_ids)
      AND p.active=true AND p.verified=true AND p.is_demo=false
      AND EXISTS (
        SELECT 1 FROM public.partner_memberships m
          JOIN public.profiles account ON account.id=m.user_id
          WHERE m.provider_id=p.id AND m.active=true
            AND m.role IN ('OWNER','OPERATOR') AND account.active=true
      );
  IF v_eligible <> v_count THEN
    RETURN jsonb_build_object('ok',false,'error','PARTNER_ELIGIBILITY_CHANGED');
  END IF;

  WITH requested AS (
    SELECT provider_id,score
      FROM unnest(p_provider_ids,p_scores) AS x(provider_id,score)
  ), new_matches AS (
    INSERT INTO public.service_request_matches(
      request_id,provider_id,match_score,status
    )
    SELECT p_request_id,provider_id,score,'pending' FROM requested
    ON CONFLICT(request_id,provider_id) DO NOTHING
    RETURNING provider_id
  )
  SELECT count(*)::integer,coalesce(jsonb_agg(provider_id),'[]'::jsonb)
    INTO v_inserted,v_ids FROM new_matches;

  IF v_inserted > 0 THEN
    UPDATE public.service_requests SET status='MATCHING',updated_at=now()
      WHERE id=p_request_id AND status='NEW';
    INSERT INTO public.admin_actions(actor_user_id,action,meta)
      VALUES(p_actor_id,'ASSIGN_SERVICE_LEADS',
        jsonb_build_object('request_id',p_request_id,'provider_ids',v_ids,'source','korual_operations_atomic'));
  END IF;

  RETURN jsonb_build_object(
    'ok',true, 'assigned',v_inserted,
    'already_assigned',v_count-v_inserted, 'provider_ids',v_ids
  );
END;
$$;

REVOKE ALL ON FUNCTION public.assign_partner_leads_v1(
 uuid,uuid,uuid[],integer[]
) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.assign_partner_leads_v1(
 uuid,uuid,uuid[],integer[]
) TO service_role;
