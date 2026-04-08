ALTER TABLE public.crm_deals 
  ADD COLUMN site_visit_template_id uuid REFERENCES public.service_templates(id),
  ADD COLUMN site_visit_data jsonb DEFAULT '{}'::jsonb;