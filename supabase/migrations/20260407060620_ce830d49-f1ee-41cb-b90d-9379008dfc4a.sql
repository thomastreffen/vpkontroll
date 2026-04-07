
-- ============================================================
-- FASE 1: Domenemodell for varmepumpebransjen
-- ============================================================

-- 1. ENUM-TYPER (6 stk)
CREATE TYPE public.customer_type AS ENUM ('private', 'business', 'housing_coop', 'public_sector');
CREATE TYPE public.site_type AS ENUM ('residential', 'commercial', 'industrial', 'cabin');
CREATE TYPE public.asset_status AS ENUM ('planned', 'installed', 'operational', 'needs_service', 'decommissioned');
CREATE TYPE public.energy_source AS ENUM ('air_air', 'air_water', 'ground_water', 'ground_brine', 'exhaust_air', 'hybrid');
CREATE TYPE public.job_type AS ENUM ('installation', 'service', 'repair', 'warranty', 'inspection', 'decommission');
CREATE TYPE public.job_status AS ENUM ('planned', 'scheduled', 'in_progress', 'completed', 'cancelled', 'on_hold');

-- 2. UNIQUE CONSTRAINTS på eksisterende tabeller for composite FKs
ALTER TABLE public.crm_companies ADD CONSTRAINT crm_companies_tenant_id_id_uq UNIQUE (tenant_id, id);
ALTER TABLE public.crm_contacts ADD CONSTRAINT crm_contacts_tenant_id_id_uq UNIQUE (tenant_id, id);

-- 3. UTVID EKSISTERENDE TABELLER

-- crm_companies: +4 kolonner
ALTER TABLE public.crm_companies
  ADD COLUMN customer_type public.customer_type NOT NULL DEFAULT 'private',
  ADD COLUMN customer_since date,
  ADD COLUMN enova_registered boolean NOT NULL DEFAULT false,
  ADD COLUMN deleted_at timestamptz;

-- crm_contacts: +1 kolonne
ALTER TABLE public.crm_contacts
  ADD COLUMN deleted_at timestamptz;

-- crm_deals: +5 kolonner (site_id FK legges til etter customer_sites er opprettet)
ALTER TABLE public.crm_deals
  ADD COLUMN site_id uuid,
  ADD COLUMN energy_source public.energy_source,
  ADD COLUMN estimated_kw numeric,
  ADD COLUMN site_visit_date date,
  ADD COLUMN site_visit_notes text;

-- 4. NYE TABELLER

-- customer_sites
CREATE TABLE public.customer_sites (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id uuid NOT NULL REFERENCES public.tenants(id),
  company_id uuid NOT NULL,
  primary_contact_id uuid,
  name text,
  site_type public.site_type NOT NULL DEFAULT 'residential',
  address text,
  postal_code text,
  city text,
  country text DEFAULT 'Norge',
  latitude numeric,
  longitude numeric,
  access_info text,
  notes text,
  created_by uuid,
  deleted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT customer_sites_tenant_id_id_uq UNIQUE (tenant_id, id),
  CONSTRAINT customer_sites_company_fk FOREIGN KEY (tenant_id, company_id) REFERENCES public.crm_companies(tenant_id, id),
  CONSTRAINT customer_sites_contact_fk FOREIGN KEY (primary_contact_id) REFERENCES public.crm_contacts(id)
);

CREATE INDEX idx_customer_sites_tenant_company ON public.customer_sites(tenant_id, company_id);

-- hvac_assets
CREATE TABLE public.hvac_assets (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id uuid NOT NULL REFERENCES public.tenants(id),
  site_id uuid NOT NULL,
  energy_source public.energy_source NOT NULL DEFAULT 'air_water',
  manufacturer text,
  model text,
  serial_number text,
  status public.asset_status NOT NULL DEFAULT 'operational',
  installed_at date,
  warranty_expires_at date,
  nominal_kw numeric,
  refrigerant_type text,
  refrigerant_kg numeric,
  indoor_unit_model text,
  outdoor_unit_location text,
  notes text,
  created_by uuid,
  deleted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT hvac_assets_tenant_id_id_uq UNIQUE (tenant_id, id),
  CONSTRAINT hvac_assets_site_fk FOREIGN KEY (tenant_id, site_id) REFERENCES public.customer_sites(tenant_id, id)
);

CREATE UNIQUE INDEX idx_hvac_assets_serial ON public.hvac_assets(tenant_id, serial_number) WHERE serial_number IS NOT NULL;
CREATE INDEX idx_hvac_assets_tenant_site ON public.hvac_assets(tenant_id, site_id);

-- jobs
CREATE TABLE public.jobs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id uuid NOT NULL REFERENCES public.tenants(id),
  job_number text NOT NULL,
  job_type public.job_type NOT NULL DEFAULT 'installation',
  status public.job_status NOT NULL DEFAULT 'planned',
  title text NOT NULL,
  description text,
  site_id uuid,
  asset_id uuid,
  company_id uuid,
  contact_id uuid,
  scheduled_start timestamptz,
  scheduled_end timestamptz,
  actual_start timestamptz,
  actual_end timestamptz,
  priority public.case_priority NOT NULL DEFAULT 'normal',
  estimated_hours numeric,
  owner_user_id uuid,
  notes text,
  created_by uuid,
  deleted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT jobs_tenant_id_id_uq UNIQUE (tenant_id, id),
  CONSTRAINT jobs_tenant_job_number_uq UNIQUE (tenant_id, job_number),
  CONSTRAINT jobs_site_fk FOREIGN KEY (tenant_id, site_id) REFERENCES public.customer_sites(tenant_id, id),
  CONSTRAINT jobs_asset_fk FOREIGN KEY (tenant_id, asset_id) REFERENCES public.hvac_assets(tenant_id, id),
  CONSTRAINT jobs_company_fk FOREIGN KEY (tenant_id, company_id) REFERENCES public.crm_companies(tenant_id, id),
  CONSTRAINT jobs_contact_fk FOREIGN KEY (tenant_id, contact_id) REFERENCES public.crm_contacts(tenant_id, id)
);

CREATE INDEX idx_jobs_tenant_status ON public.jobs(tenant_id, status);
CREATE INDEX idx_jobs_tenant_site ON public.jobs(tenant_id, site_id);
CREATE INDEX idx_jobs_tenant_type ON public.jobs(tenant_id, job_type);

-- job_technicians
CREATE TABLE public.job_technicians (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  job_id uuid NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  technician_id uuid NOT NULL REFERENCES public.technicians(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT job_technicians_job_tech_uq UNIQUE (job_id, technician_id)
);

-- 5. COMPOSITE FK: crm_deals.site_id → customer_sites
ALTER TABLE public.crm_deals
  ADD CONSTRAINT crm_deals_tenant_id_id_uq UNIQUE (tenant_id, id);
ALTER TABLE public.crm_deals
  ADD CONSTRAINT crm_deals_site_fk FOREIGN KEY (tenant_id, site_id) REFERENCES public.customer_sites(tenant_id, id);

-- 6. TRIGGERS: updated_at
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.customer_sites FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.hvac_assets FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.jobs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 7. AUTO-GENERERING: job_number
CREATE OR REPLACE FUNCTION public.generate_job_number()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
DECLARE
  next_num INT;
BEGIN
  SELECT COALESCE(MAX(CAST(SUBSTRING(job_number FROM '#([0-9]+)$') AS INT)), 0) + 1
    INTO next_num
    FROM public.jobs
    WHERE tenant_id = NEW.tenant_id;
  NEW.job_number := 'JOBB-' || LPAD(next_num::TEXT, 5, '0');
  RETURN NEW;
END;
$$;

CREATE TRIGGER generate_job_number_trigger
  BEFORE INSERT ON public.jobs
  FOR EACH ROW
  WHEN (NEW.job_number IS NULL OR NEW.job_number = '')
  EXECUTE FUNCTION public.generate_job_number();

-- 8. RLS

-- customer_sites
ALTER TABLE public.customer_sites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Master admins can manage all customer_sites" ON public.customer_sites FOR ALL TO authenticated USING (has_role(auth.uid(), 'master_admin'::app_role));
CREATE POLICY "Tenant admins can manage their customer_sites" ON public.customer_sites FOR ALL TO authenticated USING ((tenant_id = get_user_tenant_id(auth.uid())) AND has_role(auth.uid(), 'tenant_admin'::app_role));
CREATE POLICY "Tenant users can view their customer_sites" ON public.customer_sites FOR SELECT TO authenticated USING (tenant_id = get_user_tenant_id(auth.uid()));

-- hvac_assets
ALTER TABLE public.hvac_assets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Master admins can manage all hvac_assets" ON public.hvac_assets FOR ALL TO authenticated USING (has_role(auth.uid(), 'master_admin'::app_role));
CREATE POLICY "Tenant admins can manage their hvac_assets" ON public.hvac_assets FOR ALL TO authenticated USING ((tenant_id = get_user_tenant_id(auth.uid())) AND has_role(auth.uid(), 'tenant_admin'::app_role));
CREATE POLICY "Tenant users can view their hvac_assets" ON public.hvac_assets FOR SELECT TO authenticated USING (tenant_id = get_user_tenant_id(auth.uid()));

-- jobs
ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Master admins can manage all jobs" ON public.jobs FOR ALL TO authenticated USING (has_role(auth.uid(), 'master_admin'::app_role));
CREATE POLICY "Tenant admins can manage their jobs" ON public.jobs FOR ALL TO authenticated USING ((tenant_id = get_user_tenant_id(auth.uid())) AND has_role(auth.uid(), 'tenant_admin'::app_role));
CREATE POLICY "Tenant users can view their jobs" ON public.jobs FOR SELECT TO authenticated USING (tenant_id = get_user_tenant_id(auth.uid()));

-- job_technicians (via jobs for tenant scope)
ALTER TABLE public.job_technicians ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Master admins can manage all job_technicians" ON public.job_technicians FOR ALL TO authenticated USING (has_role(auth.uid(), 'master_admin'::app_role));
CREATE POLICY "Tenant admins can manage their job_technicians" ON public.job_technicians FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM jobs j WHERE j.id = job_technicians.job_id AND j.tenant_id = get_user_tenant_id(auth.uid())) AND has_role(auth.uid(), 'tenant_admin'::app_role));
CREATE POLICY "Tenant users can view their job_technicians" ON public.job_technicians FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM jobs j WHERE j.id = job_technicians.job_id AND j.tenant_id = get_user_tenant_id(auth.uid())));
