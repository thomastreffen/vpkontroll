ALTER TABLE public.jobs ADD COLUMN deal_id uuid REFERENCES public.crm_deals(id);
CREATE INDEX idx_jobs_deal_id ON public.jobs(deal_id) WHERE deal_id IS NOT NULL;