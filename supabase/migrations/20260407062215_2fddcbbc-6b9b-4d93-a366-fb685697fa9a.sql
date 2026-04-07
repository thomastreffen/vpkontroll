
-- ============================================================
-- FASE 3A: Installasjonssjekklister
-- ============================================================

-- installation_checklists
CREATE TABLE public.installation_checklists (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id uuid NOT NULL REFERENCES public.tenants(id),
  job_id uuid NOT NULL,
  template_name text NOT NULL,
  completed_at timestamptz,
  completed_by uuid,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT installation_checklists_tenant_id_id_uq UNIQUE (tenant_id, id),
  CONSTRAINT installation_checklists_job_fk FOREIGN KEY (tenant_id, job_id) REFERENCES public.jobs(tenant_id, id)
);

CREATE INDEX idx_installation_checklists_tenant_job ON public.installation_checklists(tenant_id, job_id);

-- checklist_items
CREATE TABLE public.checklist_items (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id uuid NOT NULL REFERENCES public.tenants(id),
  checklist_id uuid NOT NULL,
  sort_order int NOT NULL DEFAULT 0,
  label text NOT NULL,
  is_checked boolean NOT NULL DEFAULT false,
  checked_at timestamptz,
  checked_by uuid,
  note text,
  CONSTRAINT checklist_items_checklist_fk FOREIGN KEY (tenant_id, checklist_id) REFERENCES public.installation_checklists(tenant_id, id) ON DELETE CASCADE
);

CREATE INDEX idx_checklist_items_checklist_sort ON public.checklist_items(checklist_id, sort_order);

-- RLS: installation_checklists
ALTER TABLE public.installation_checklists ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Master admins can manage all installation_checklists" ON public.installation_checklists FOR ALL TO authenticated USING (has_role(auth.uid(), 'master_admin'::app_role));
CREATE POLICY "Tenant admins can manage their installation_checklists" ON public.installation_checklists FOR ALL TO authenticated USING ((tenant_id = get_user_tenant_id(auth.uid())) AND has_role(auth.uid(), 'tenant_admin'::app_role));
CREATE POLICY "Tenant users can view their installation_checklists" ON public.installation_checklists FOR SELECT TO authenticated USING (tenant_id = get_user_tenant_id(auth.uid()));

-- RLS: checklist_items
ALTER TABLE public.checklist_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Master admins can manage all checklist_items" ON public.checklist_items FOR ALL TO authenticated USING (has_role(auth.uid(), 'master_admin'::app_role));
CREATE POLICY "Tenant admins can manage their checklist_items" ON public.checklist_items FOR ALL TO authenticated USING ((tenant_id = get_user_tenant_id(auth.uid())) AND has_role(auth.uid(), 'tenant_admin'::app_role));
CREATE POLICY "Tenant users can view their checklist_items" ON public.checklist_items FOR SELECT TO authenticated USING (tenant_id = get_user_tenant_id(auth.uid()));
