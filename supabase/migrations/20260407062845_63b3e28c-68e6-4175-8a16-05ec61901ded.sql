
-- ============================================================
-- FASE 3C: Service generation infrastructure
-- ============================================================

-- 1. Add agreement_period to service_visits for idempotency
ALTER TABLE public.service_visits
  ADD COLUMN IF NOT EXISTS agreement_period date;

-- Unique constraint: one visit per agreement per period
ALTER TABLE public.service_visits
  ADD CONSTRAINT service_visits_agreement_period_uq
  UNIQUE (tenant_id, agreement_id, agreement_period);

CREATE INDEX idx_service_visits_agreement_period
  ON public.service_visits(tenant_id, agreement_id, agreement_period)
  WHERE agreement_period IS NOT NULL;

-- 2. service_generation_runs log table
CREATE TABLE public.service_generation_runs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  status text NOT NULL DEFAULT 'running',
  agreements_scanned int NOT NULL DEFAULT 0,
  visits_created int NOT NULL DEFAULT 0,
  jobs_created int NOT NULL DEFAULT 0,
  errors_count int NOT NULL DEFAULT 0,
  error_details jsonb DEFAULT '[]'::jsonb,
  triggered_by text DEFAULT 'cron'
);

ALTER TABLE public.service_generation_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Master admins can manage service_generation_runs"
  ON public.service_generation_runs FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'master_admin'::app_role));

CREATE POLICY "Tenant admins can view service_generation_runs"
  ON public.service_generation_runs FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'tenant_admin'::app_role));

-- 3. Enable pg_cron and pg_net
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;
