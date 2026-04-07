
-- ============================================================
-- FASE 3B: Documents + Storage bucket
-- ============================================================

-- 1. Enum for dokumentkategori
CREATE TYPE public.document_category AS ENUM (
  'photo','certificate','manual','invoice','quote_pdf',
  'service_report','checklist_pdf','warranty_doc','contract','other'
);

-- 2. Documents-tabell
CREATE TABLE public.documents (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id uuid NOT NULL REFERENCES public.tenants(id),
  asset_id uuid,
  job_id uuid,
  service_visit_id uuid,
  warranty_case_id uuid,
  category public.document_category NOT NULL DEFAULT 'other',
  file_name text NOT NULL,
  file_path text NOT NULL,
  file_size_bytes bigint,
  mime_type text,
  description text,
  uploaded_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,

  CONSTRAINT documents_tenant_id_id_uq UNIQUE (tenant_id, id),
  CONSTRAINT documents_asset_fk FOREIGN KEY (tenant_id, asset_id) REFERENCES public.hvac_assets(tenant_id, id),
  CONSTRAINT documents_job_fk FOREIGN KEY (tenant_id, job_id) REFERENCES public.jobs(tenant_id, id),
  CONSTRAINT documents_visit_fk FOREIGN KEY (tenant_id, service_visit_id) REFERENCES public.service_visits(tenant_id, id),
  CONSTRAINT documents_warranty_fk FOREIGN KEY (tenant_id, warranty_case_id) REFERENCES public.warranty_cases(tenant_id, id)
);

-- 3. Indekser
CREATE INDEX idx_documents_tenant ON public.documents(tenant_id);
CREATE INDEX idx_documents_asset ON public.documents(tenant_id, asset_id) WHERE asset_id IS NOT NULL;
CREATE INDEX idx_documents_job ON public.documents(tenant_id, job_id) WHERE job_id IS NOT NULL;
CREATE INDEX idx_documents_visit ON public.documents(tenant_id, service_visit_id) WHERE service_visit_id IS NOT NULL;
CREATE INDEX idx_documents_warranty ON public.documents(tenant_id, warranty_case_id) WHERE warranty_case_id IS NOT NULL;
CREATE INDEX idx_documents_not_deleted ON public.documents(tenant_id) WHERE deleted_at IS NULL;

-- 4. RLS
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Master admins can manage all documents"
  ON public.documents FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'master_admin'::app_role));

CREATE POLICY "Tenant admins can manage their documents"
  ON public.documents FOR ALL TO authenticated
  USING ((tenant_id = get_user_tenant_id(auth.uid())) AND has_role(auth.uid(), 'tenant_admin'::app_role));

CREATE POLICY "Tenant users can view their documents"
  ON public.documents FOR SELECT TO authenticated
  USING (tenant_id = get_user_tenant_id(auth.uid()));

-- 5. Storage bucket (én felles bucket, tenant-isolert via path)
INSERT INTO storage.buckets (id, name, public)
VALUES ('tenant-documents', 'tenant-documents', false);

-- 6. Storage RLS policies
CREATE POLICY "Authenticated users can upload to their tenant folder"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'tenant-documents'
    AND (storage.foldername(name))[1] = get_user_tenant_id(auth.uid())::text
  );

CREATE POLICY "Authenticated users can view their tenant files"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'tenant-documents'
    AND (storage.foldername(name))[1] = get_user_tenant_id(auth.uid())::text
  );

CREATE POLICY "Tenant admins can delete their tenant files"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'tenant-documents'
    AND (storage.foldername(name))[1] = get_user_tenant_id(auth.uid())::text
    AND has_role(auth.uid(), 'tenant_admin'::app_role)
  );

CREATE POLICY "Master admins can manage all storage files"
  ON storage.objects FOR ALL TO authenticated
  USING (
    bucket_id = 'tenant-documents'
    AND has_role(auth.uid(), 'master_admin'::app_role)
  );
