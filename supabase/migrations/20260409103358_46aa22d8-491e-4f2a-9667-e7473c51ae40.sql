
-- Add publish fields to service_templates
ALTER TABLE public.service_templates
  ADD COLUMN IF NOT EXISTS is_published boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS publish_key text UNIQUE,
  ADD COLUMN IF NOT EXISTS web_form_type text,
  ADD COLUMN IF NOT EXISTS success_message text DEFAULT 'Takk for din henvendelse! Vi tar kontakt så snart som mulig.';

-- Create index on publish_key for fast lookups
CREATE INDEX IF NOT EXISTS idx_service_templates_publish_key ON public.service_templates(publish_key) WHERE publish_key IS NOT NULL;

-- Create form_submissions table
CREATE TABLE public.form_submissions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  template_id uuid NOT NULL REFERENCES public.service_templates(id),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id),
  payload jsonb NOT NULL DEFAULT '{}',
  source_url text,
  web_form_type text,
  submitted_at timestamp with time zone NOT NULL DEFAULT now(),
  created_case_id uuid,
  created_deal_id uuid,
  created_company_id uuid,
  created_contact_id uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.form_submissions ENABLE ROW LEVEL SECURITY;

-- RLS policies for form_submissions
CREATE POLICY "Master admins can manage all form_submissions"
  ON public.form_submissions FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'master_admin'::app_role));

CREATE POLICY "Tenant admins can manage their form_submissions"
  ON public.form_submissions FOR ALL TO authenticated
  USING (tenant_id = get_user_tenant_id(auth.uid()) AND has_role(auth.uid(), 'tenant_admin'::app_role));

CREATE POLICY "Tenant users can view their form_submissions"
  ON public.form_submissions FOR SELECT TO authenticated
  USING (tenant_id = get_user_tenant_id(auth.uid()));

-- Allow anon to read published templates (for public form rendering)
CREATE POLICY "Anyone can read published templates"
  ON public.service_templates FOR SELECT TO anon
  USING (is_published = true AND publish_key IS NOT NULL);

-- Allow anon to read fields of published templates
CREATE POLICY "Anyone can read published template fields"
  ON public.service_template_fields FOR SELECT TO anon
  USING (EXISTS (
    SELECT 1 FROM public.service_templates st
    WHERE st.id = service_template_fields.template_id
      AND st.is_published = true
      AND st.publish_key IS NOT NULL
  ));
