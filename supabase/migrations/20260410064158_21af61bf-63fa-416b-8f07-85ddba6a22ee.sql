
-- =============================================
-- RLS policies for tenant user writes (INSERT/UPDATE/DELETE)
-- Uses check_tenant_permission() for granular permission checks
-- =============================================

-- ── crm_companies ──
CREATE POLICY "Tenant users can insert companies" ON public.crm_companies
  FOR INSERT TO authenticated
  WITH CHECK (tenant_id = get_user_tenant_id(auth.uid()) AND check_tenant_permission(auth.uid(), 'companies.create'));

CREATE POLICY "Tenant users can update companies" ON public.crm_companies
  FOR UPDATE TO authenticated
  USING (tenant_id = get_user_tenant_id(auth.uid()) AND check_tenant_permission(auth.uid(), 'companies.edit'));

CREATE POLICY "Tenant users can delete companies" ON public.crm_companies
  FOR DELETE TO authenticated
  USING (tenant_id = get_user_tenant_id(auth.uid()) AND check_tenant_permission(auth.uid(), 'companies.delete'));

-- ── crm_contacts ──
CREATE POLICY "Tenant users can insert contacts" ON public.crm_contacts
  FOR INSERT TO authenticated
  WITH CHECK (tenant_id = get_user_tenant_id(auth.uid()) AND check_tenant_permission(auth.uid(), 'contacts.create'));

CREATE POLICY "Tenant users can update contacts" ON public.crm_contacts
  FOR UPDATE TO authenticated
  USING (tenant_id = get_user_tenant_id(auth.uid()) AND check_tenant_permission(auth.uid(), 'contacts.edit'));

CREATE POLICY "Tenant users can delete contacts" ON public.crm_contacts
  FOR DELETE TO authenticated
  USING (tenant_id = get_user_tenant_id(auth.uid()) AND check_tenant_permission(auth.uid(), 'contacts.delete'));

-- ── crm_deals ──
CREATE POLICY "Tenant users can insert deals" ON public.crm_deals
  FOR INSERT TO authenticated
  WITH CHECK (tenant_id = get_user_tenant_id(auth.uid()) AND check_tenant_permission(auth.uid(), 'deals.create'));

CREATE POLICY "Tenant users can update deals" ON public.crm_deals
  FOR UPDATE TO authenticated
  USING (tenant_id = get_user_tenant_id(auth.uid()) AND check_tenant_permission(auth.uid(), 'deals.edit'));

CREATE POLICY "Tenant users can delete deals" ON public.crm_deals
  FOR DELETE TO authenticated
  USING (tenant_id = get_user_tenant_id(auth.uid()) AND check_tenant_permission(auth.uid(), 'deals.delete'));

-- ── jobs ──
CREATE POLICY "Tenant users can insert jobs" ON public.jobs
  FOR INSERT TO authenticated
  WITH CHECK (tenant_id = get_user_tenant_id(auth.uid()) AND check_tenant_permission(auth.uid(), 'jobs.create'));

CREATE POLICY "Tenant users can update jobs" ON public.jobs
  FOR UPDATE TO authenticated
  USING (tenant_id = get_user_tenant_id(auth.uid()) AND check_tenant_permission(auth.uid(), 'jobs.edit'));

CREATE POLICY "Tenant users can delete jobs" ON public.jobs
  FOR DELETE TO authenticated
  USING (tenant_id = get_user_tenant_id(auth.uid()) AND check_tenant_permission(auth.uid(), 'jobs.delete'));

-- ── hvac_assets ──
CREATE POLICY "Tenant users can insert assets" ON public.hvac_assets
  FOR INSERT TO authenticated
  WITH CHECK (tenant_id = get_user_tenant_id(auth.uid()) AND check_tenant_permission(auth.uid(), 'assets.create'));

CREATE POLICY "Tenant users can update assets" ON public.hvac_assets
  FOR UPDATE TO authenticated
  USING (tenant_id = get_user_tenant_id(auth.uid()) AND check_tenant_permission(auth.uid(), 'assets.edit'));

CREATE POLICY "Tenant users can delete assets" ON public.hvac_assets
  FOR DELETE TO authenticated
  USING (tenant_id = get_user_tenant_id(auth.uid()) AND check_tenant_permission(auth.uid(), 'assets.delete'));

-- ── service_agreements ──
CREATE POLICY "Tenant users can insert agreements" ON public.service_agreements
  FOR INSERT TO authenticated
  WITH CHECK (tenant_id = get_user_tenant_id(auth.uid()) AND check_tenant_permission(auth.uid(), 'agreements.create'));

CREATE POLICY "Tenant users can update agreements" ON public.service_agreements
  FOR UPDATE TO authenticated
  USING (tenant_id = get_user_tenant_id(auth.uid()) AND check_tenant_permission(auth.uid(), 'agreements.edit'));

CREATE POLICY "Tenant users can delete agreements" ON public.service_agreements
  FOR DELETE TO authenticated
  USING (tenant_id = get_user_tenant_id(auth.uid()) AND check_tenant_permission(auth.uid(), 'agreements.delete'));

-- ── documents ──
CREATE POLICY "Tenant users can insert documents" ON public.documents
  FOR INSERT TO authenticated
  WITH CHECK (tenant_id = get_user_tenant_id(auth.uid()) AND check_tenant_permission(auth.uid(), 'documents.upload'));

CREATE POLICY "Tenant users can delete documents" ON public.documents
  FOR DELETE TO authenticated
  USING (tenant_id = get_user_tenant_id(auth.uid()) AND check_tenant_permission(auth.uid(), 'documents.delete'));

-- ── warranty_cases ──
CREATE POLICY "Tenant users can insert warranties" ON public.warranty_cases
  FOR INSERT TO authenticated
  WITH CHECK (tenant_id = get_user_tenant_id(auth.uid()) AND check_tenant_permission(auth.uid(), 'warranties.create'));

CREATE POLICY "Tenant users can update warranties" ON public.warranty_cases
  FOR UPDATE TO authenticated
  USING (tenant_id = get_user_tenant_id(auth.uid()) AND check_tenant_permission(auth.uid(), 'warranties.edit'));

-- ── customer_sites ──
CREATE POLICY "Tenant users can insert sites" ON public.customer_sites
  FOR INSERT TO authenticated
  WITH CHECK (tenant_id = get_user_tenant_id(auth.uid()) AND check_tenant_permission(auth.uid(), 'sites.create'));

CREATE POLICY "Tenant users can update sites" ON public.customer_sites
  FOR UPDATE TO authenticated
  USING (tenant_id = get_user_tenant_id(auth.uid()) AND check_tenant_permission(auth.uid(), 'sites.edit'));

-- ── quotes ──
CREATE POLICY "Tenant users can insert quotes" ON public.quotes
  FOR INSERT TO authenticated
  WITH CHECK (tenant_id = get_user_tenant_id(auth.uid()) AND check_tenant_permission(auth.uid(), 'quotes.create'));

CREATE POLICY "Tenant users can update quotes" ON public.quotes
  FOR UPDATE TO authenticated
  USING (tenant_id = get_user_tenant_id(auth.uid()) AND check_tenant_permission(auth.uid(), 'quotes.edit'));

-- ── quote_lines ──
CREATE POLICY "Tenant users can insert quote_lines" ON public.quote_lines
  FOR INSERT TO authenticated
  WITH CHECK (tenant_id = get_user_tenant_id(auth.uid()) AND check_tenant_permission(auth.uid(), 'quotes.create'));

CREATE POLICY "Tenant users can update quote_lines" ON public.quote_lines
  FOR UPDATE TO authenticated
  USING (tenant_id = get_user_tenant_id(auth.uid()) AND check_tenant_permission(auth.uid(), 'quotes.edit'));

-- ── cases ──
CREATE POLICY "Tenant users can insert cases" ON public.cases
  FOR INSERT TO authenticated
  WITH CHECK (tenant_id = get_user_tenant_id(auth.uid()) AND check_tenant_permission(auth.uid(), 'cases.create'));

CREATE POLICY "Tenant users can update cases" ON public.cases
  FOR UPDATE TO authenticated
  USING (tenant_id = get_user_tenant_id(auth.uid()) AND check_tenant_permission(auth.uid(), 'cases.edit'));

CREATE POLICY "Tenant users can delete cases" ON public.cases
  FOR DELETE TO authenticated
  USING (tenant_id = get_user_tenant_id(auth.uid()) AND check_tenant_permission(auth.uid(), 'cases.delete'));

-- ── case_items ──
CREATE POLICY "Tenant users can insert case_items" ON public.case_items
  FOR INSERT TO authenticated
  WITH CHECK (tenant_id = get_user_tenant_id(auth.uid()) AND check_tenant_permission(auth.uid(), 'cases.create'));

CREATE POLICY "Tenant users can update case_items" ON public.case_items
  FOR UPDATE TO authenticated
  USING (tenant_id = get_user_tenant_id(auth.uid()) AND check_tenant_permission(auth.uid(), 'cases.edit'));

-- ── events ──
CREATE POLICY "Tenant users can insert events" ON public.events
  FOR INSERT TO authenticated
  WITH CHECK (tenant_id = get_user_tenant_id(auth.uid()) AND check_tenant_permission(auth.uid(), 'ressursplan.schedule'));

CREATE POLICY "Tenant users can update events" ON public.events
  FOR UPDATE TO authenticated
  USING (tenant_id = get_user_tenant_id(auth.uid()) AND check_tenant_permission(auth.uid(), 'ressursplan.schedule'));

CREATE POLICY "Tenant users can delete events" ON public.events
  FOR DELETE TO authenticated
  USING (tenant_id = get_user_tenant_id(auth.uid()) AND check_tenant_permission(auth.uid(), 'ressursplan.schedule'));

-- ── event_technicians ──
CREATE POLICY "Tenant users can insert event_technicians" ON public.event_technicians
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM events e WHERE e.id = event_technicians.event_id AND e.tenant_id = get_user_tenant_id(auth.uid())) AND check_tenant_permission(auth.uid(), 'ressursplan.schedule'));

CREATE POLICY "Tenant users can update event_technicians" ON public.event_technicians
  FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM events e WHERE e.id = event_technicians.event_id AND e.tenant_id = get_user_tenant_id(auth.uid())) AND check_tenant_permission(auth.uid(), 'ressursplan.schedule'));

CREATE POLICY "Tenant users can delete event_technicians" ON public.event_technicians
  FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM events e WHERE e.id = event_technicians.event_id AND e.tenant_id = get_user_tenant_id(auth.uid())) AND check_tenant_permission(auth.uid(), 'ressursplan.schedule'));

-- ── service_visits ──
CREATE POLICY "Tenant users can insert service_visits" ON public.service_visits
  FOR INSERT TO authenticated
  WITH CHECK (tenant_id = get_user_tenant_id(auth.uid()) AND check_tenant_permission(auth.uid(), 'jobs.edit'));

CREATE POLICY "Tenant users can update service_visits" ON public.service_visits
  FOR UPDATE TO authenticated
  USING (tenant_id = get_user_tenant_id(auth.uid()) AND check_tenant_permission(auth.uid(), 'jobs.edit'));

-- ── checklist_items ──
CREATE POLICY "Tenant users can insert checklist_items" ON public.checklist_items
  FOR INSERT TO authenticated
  WITH CHECK (tenant_id = get_user_tenant_id(auth.uid()) AND check_tenant_permission(auth.uid(), 'jobs.edit'));

CREATE POLICY "Tenant users can update checklist_items" ON public.checklist_items
  FOR UPDATE TO authenticated
  USING (tenant_id = get_user_tenant_id(auth.uid()) AND check_tenant_permission(auth.uid(), 'jobs.edit'));

-- ── installation_checklists ──
CREATE POLICY "Tenant users can insert installation_checklists" ON public.installation_checklists
  FOR INSERT TO authenticated
  WITH CHECK (tenant_id = get_user_tenant_id(auth.uid()) AND check_tenant_permission(auth.uid(), 'jobs.edit'));

CREATE POLICY "Tenant users can update installation_checklists" ON public.installation_checklists
  FOR UPDATE TO authenticated
  USING (tenant_id = get_user_tenant_id(auth.uid()) AND check_tenant_permission(auth.uid(), 'jobs.edit'));

-- ── job_technicians ──
CREATE POLICY "Tenant users can insert job_technicians" ON public.job_technicians
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM jobs j WHERE j.id = job_technicians.job_id AND j.tenant_id = get_user_tenant_id(auth.uid())) AND check_tenant_permission(auth.uid(), 'jobs.edit'));

CREATE POLICY "Tenant users can update job_technicians" ON public.job_technicians
  FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM jobs j WHERE j.id = job_technicians.job_id AND j.tenant_id = get_user_tenant_id(auth.uid())) AND check_tenant_permission(auth.uid(), 'jobs.edit'));

CREATE POLICY "Tenant users can delete job_technicians" ON public.job_technicians
  FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM jobs j WHERE j.id = job_technicians.job_id AND j.tenant_id = get_user_tenant_id(auth.uid())) AND check_tenant_permission(auth.uid(), 'jobs.edit'));

-- ── technicians ──
CREATE POLICY "Tenant users can insert technicians" ON public.technicians
  FOR INSERT TO authenticated
  WITH CHECK (tenant_id = get_user_tenant_id(auth.uid()) AND check_tenant_permission(auth.uid(), 'technicians.manage'));

CREATE POLICY "Tenant users can update technicians" ON public.technicians
  FOR UPDATE TO authenticated
  USING (tenant_id = get_user_tenant_id(auth.uid()) AND check_tenant_permission(auth.uid(), 'technicians.manage'));

-- ── crm_activities ──
CREATE POLICY "Tenant users can insert activities" ON public.crm_activities
  FOR INSERT TO authenticated
  WITH CHECK (tenant_id = get_user_tenant_id(auth.uid()));

CREATE POLICY "Tenant users can update activities" ON public.crm_activities
  FOR UPDATE TO authenticated
  USING (tenant_id = get_user_tenant_id(auth.uid()) AND created_by = auth.uid());

-- ── service_templates ──
CREATE POLICY "Tenant users can insert templates" ON public.service_templates
  FOR INSERT TO authenticated
  WITH CHECK (tenant_id = get_user_tenant_id(auth.uid()) AND check_tenant_permission(auth.uid(), 'templates.manage'));

CREATE POLICY "Tenant users can update templates" ON public.service_templates
  FOR UPDATE TO authenticated
  USING (tenant_id = get_user_tenant_id(auth.uid()) AND check_tenant_permission(auth.uid(), 'templates.manage'));

-- ── service_template_fields ──
CREATE POLICY "Tenant users can insert template_fields" ON public.service_template_fields
  FOR INSERT TO authenticated
  WITH CHECK (tenant_id = get_user_tenant_id(auth.uid()) AND check_tenant_permission(auth.uid(), 'templates.manage'));

CREATE POLICY "Tenant users can update template_fields" ON public.service_template_fields
  FOR UPDATE TO authenticated
  USING (tenant_id = get_user_tenant_id(auth.uid()) AND check_tenant_permission(auth.uid(), 'templates.manage'));

CREATE POLICY "Tenant users can delete template_fields" ON public.service_template_fields
  FOR DELETE TO authenticated
  USING (tenant_id = get_user_tenant_id(auth.uid()) AND check_tenant_permission(auth.uid(), 'templates.manage'));
