-- ================================================================
-- Service generation fix
--
-- Root causes fixed:
-- 1. Edge function excluded overdue agreements (.gte filter bug)
-- 2. No pg_cron job was ever created (only extension was enabled)
--
-- Solution: PL/pgSQL functions callable from both pg_cron and RPC,
-- avoiding HTTP dependency for the scheduled case.
-- ================================================================

-- ── Allow all tenant users to read generation run history ────────
-- Previously only master_admin/tenant_admin could read this table,
-- causing the "Automasjon" tab to always show empty for regular users.
DROP POLICY IF EXISTS "Tenant admins can view service_generation_runs" ON public.service_generation_runs;

CREATE POLICY "Tenant users can view service_generation_runs"
  ON public.service_generation_runs FOR SELECT TO authenticated
  USING (true);  -- all runs are global; no tenant_id on this table

-- ── Bulk generation function (called by pg_cron) ─────────────────
-- Processes all active agreements where next_visit_due <= today+30 days.
-- No lower bound so overdue agreements are included.
CREATE OR REPLACE FUNCTION public.generate_overdue_service_visits()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  ag             RECORD;
  existing_id    uuid;
  new_job_id     uuid;
  months         int;
  v_run_id       uuid;
  v_scanned      int := 0;
  v_visits       int := 0;
  v_jobs         int := 0;
  v_errors       int := 0;
BEGIN
  INSERT INTO service_generation_runs (triggered_by, status)
  VALUES ('pg_cron', 'running')
  RETURNING id INTO v_run_id;

  FOR ag IN
    SELECT
      sa.id, sa.tenant_id, sa.company_id, sa.site_id, sa.asset_id,
      sa.interval, sa.custom_interval_months, sa.next_visit_due,
      sa.scope_description
    FROM service_agreements sa
    WHERE sa.status   = 'active'
      AND sa.next_visit_due IS NOT NULL
      AND sa.next_visit_due <= CURRENT_DATE + interval '30 days'
      AND sa.deleted_at IS NULL
  LOOP
    v_scanned := v_scanned + 1;
    BEGIN
      -- Idempotency: skip if a visit already exists for this period
      SELECT id INTO existing_id
      FROM service_visits
      WHERE tenant_id      = ag.tenant_id
        AND agreement_id   = ag.id
        AND agreement_period = ag.next_visit_due
      LIMIT 1;

      IF existing_id IS NOT NULL THEN
        CONTINUE;
      END IF;

      months := CASE ag.interval
        WHEN 'monthly'     THEN 1
        WHEN 'quarterly'   THEN 3
        WHEN 'semi_annual' THEN 6
        WHEN 'annual'      THEN 12
        WHEN 'biennial'    THEN 24
        WHEN 'custom'      THEN COALESCE(ag.custom_interval_months, 12)
        ELSE 12
      END;

      INSERT INTO jobs (
        tenant_id, job_number, job_type, title,
        company_id, site_id, asset_id,
        scheduled_start, status, priority
      ) VALUES (
        ag.tenant_id, 'AUTO', 'service',
        'Service – ' || COALESCE(ag.scope_description, 'Serviceavtale'),
        ag.company_id, ag.site_id, ag.asset_id,
        ag.next_visit_due, 'planned', 'normal'
      )
      RETURNING id INTO new_job_id;

      v_jobs := v_jobs + 1;

      INSERT INTO service_visits (
        tenant_id, agreement_id, job_id,
        asset_id, site_id,
        scheduled_date, agreement_period, status
      ) VALUES (
        ag.tenant_id, ag.id, new_job_id,
        ag.asset_id, ag.site_id,
        ag.next_visit_due, ag.next_visit_due, 'planned'
      );

      v_visits := v_visits + 1;

      UPDATE service_agreements
      SET next_visit_due = ag.next_visit_due + (months || ' months')::interval
      WHERE id = ag.id;

    EXCEPTION WHEN OTHERS THEN
      v_errors := v_errors + 1;
    END;
  END LOOP;

  UPDATE service_generation_runs
  SET
    completed_at       = now(),
    status             = CASE WHEN v_errors > 0 THEN 'completed_with_errors' ELSE 'completed' END,
    agreements_scanned = v_scanned,
    visits_created     = v_visits,
    jobs_created       = v_jobs,
    errors_count       = v_errors
  WHERE id = v_run_id;

  RETURN jsonb_build_object(
    'run_id',              v_run_id,
    'agreements_scanned',  v_scanned,
    'visits_created',      v_visits,
    'jobs_created',        v_jobs,
    'errors',              v_errors
  );
END;
$$;

-- ── Single-agreement function (called via RPC from frontend) ──────
-- Catches up all overdue periods for one specific agreement.
-- Includes tenant access check (SECURITY DEFINER bypasses RLS).
CREATE OR REPLACE FUNCTION public.generate_service_visit_now(p_agreement_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  ag             RECORD;
  existing_id    uuid;
  new_job_id     uuid;
  months         int;
  v_run_id       uuid;
  v_visits       int := 0;
  v_jobs         int := 0;
  v_tenant_id    uuid;
BEGIN
  -- Verify agreement exists and belongs to the calling user's tenant
  SELECT tenant_id INTO v_tenant_id
  FROM service_agreements
  WHERE id = p_agreement_id AND deleted_at IS NULL;

  IF v_tenant_id IS NULL THEN
    RAISE EXCEPTION 'Agreement not found';
  END IF;

  IF v_tenant_id IS DISTINCT FROM get_user_tenant_id(auth.uid()) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  INSERT INTO service_generation_runs (triggered_by, status)
  VALUES ('manual', 'running')
  RETURNING id INTO v_run_id;

  -- Loop: catch up all overdue periods until next_visit_due is future
  LOOP
    SELECT
      sa.id, sa.tenant_id, sa.company_id, sa.site_id, sa.asset_id,
      sa.interval, sa.custom_interval_months, sa.next_visit_due,
      sa.scope_description
    INTO ag
    FROM service_agreements sa
    WHERE sa.id           = p_agreement_id
      AND sa.status       = 'active'
      AND sa.next_visit_due IS NOT NULL
      AND sa.next_visit_due <= CURRENT_DATE + interval '30 days'
      AND sa.deleted_at IS NULL;

    EXIT WHEN NOT FOUND;

    -- Idempotency check
    SELECT id INTO existing_id
    FROM service_visits
    WHERE tenant_id      = ag.tenant_id
      AND agreement_id   = ag.id
      AND agreement_period = ag.next_visit_due
    LIMIT 1;

    months := CASE ag.interval
      WHEN 'monthly'     THEN 1
      WHEN 'quarterly'   THEN 3
      WHEN 'semi_annual' THEN 6
      WHEN 'annual'      THEN 12
      WHEN 'biennial'    THEN 24
      WHEN 'custom'      THEN COALESCE(ag.custom_interval_months, 12)
      ELSE 12
    END;

    IF existing_id IS NULL THEN
      INSERT INTO jobs (
        tenant_id, job_number, job_type, title,
        company_id, site_id, asset_id,
        scheduled_start, status, priority
      ) VALUES (
        ag.tenant_id, 'AUTO', 'service',
        'Service – ' || COALESCE(ag.scope_description, 'Serviceavtale'),
        ag.company_id, ag.site_id, ag.asset_id,
        ag.next_visit_due, 'planned', 'normal'
      )
      RETURNING id INTO new_job_id;

      v_jobs := v_jobs + 1;

      INSERT INTO service_visits (
        tenant_id, agreement_id, job_id,
        asset_id, site_id,
        scheduled_date, agreement_period, status
      ) VALUES (
        ag.tenant_id, ag.id, new_job_id,
        ag.asset_id, ag.site_id,
        ag.next_visit_due, ag.next_visit_due, 'planned'
      );

      v_visits := v_visits + 1;
    END IF;

    -- Advance next_visit_due regardless (handles stuck state if visit existed)
    UPDATE service_agreements
    SET next_visit_due = ag.next_visit_due + (months || ' months')::interval
    WHERE id = ag.id;

  END LOOP;

  UPDATE service_generation_runs
  SET
    completed_at       = now(),
    status             = 'completed',
    agreements_scanned = 1,
    visits_created     = v_visits,
    jobs_created       = v_jobs
  WHERE id = v_run_id;

  RETURN jsonb_build_object(
    'visits_created', v_visits,
    'jobs_created',   v_jobs,
    'run_id',         v_run_id
  );
END;
$$;

-- ── Grant RPC access to authenticated users ───────────────────────
GRANT EXECUTE ON FUNCTION public.generate_service_visit_now(uuid) TO authenticated;

-- ── Schedule pg_cron job ──────────────────────────────────────────
-- Runs at 04:00 UTC = 06:00 CEST (summer) / 05:00 CET (winter)
-- Removes old job first in case of re-run
SELECT cron.unschedule('generate-service-visits') WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'generate-service-visits'
);

SELECT cron.schedule(
  'generate-service-visits',
  '0 4 * * *',
  'SELECT public.generate_overdue_service_visits()'
);
