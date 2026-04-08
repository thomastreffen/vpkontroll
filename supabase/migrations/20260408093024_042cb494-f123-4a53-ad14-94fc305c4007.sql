
-- Add 'custom' to agreement_interval enum
ALTER TYPE public.agreement_interval ADD VALUE IF NOT EXISTS 'custom';

-- Add custom_interval_months to service_agreements
ALTER TABLE public.service_agreements ADD COLUMN IF NOT EXISTS custom_interval_months integer;

-- Add agreement_id to documents for agreement-level documents
ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS agreement_id uuid;

-- Add report_data to service_visits for structured service report data
ALTER TABLE public.service_visits ADD COLUMN IF NOT EXISTS report_data jsonb DEFAULT '{}'::jsonb;
