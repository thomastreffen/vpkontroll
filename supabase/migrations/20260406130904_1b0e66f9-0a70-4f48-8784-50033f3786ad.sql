
-- Event status enum
CREATE TYPE public.event_status AS ENUM ('planned', 'in_progress', 'completed', 'cancelled');

-- Technicians table
CREATE TABLE public.technicians (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  user_id UUID,
  name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  color TEXT DEFAULT '#3b82f6',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Events table
CREATE TABLE public.events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  customer TEXT,
  address TEXT,
  description TEXT,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  status public.event_status NOT NULL DEFAULT 'planned',
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

-- Event-technician junction
CREATE TABLE public.event_technicians (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  technician_id UUID NOT NULL REFERENCES public.technicians(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(event_id, technician_id)
);

-- Enable RLS
ALTER TABLE public.technicians ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_technicians ENABLE ROW LEVEL SECURITY;

-- RLS: Technicians
CREATE POLICY "Master admins can manage all technicians" ON public.technicians FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'master_admin'));
CREATE POLICY "Tenant users can view their technicians" ON public.technicians FOR SELECT TO authenticated
  USING (tenant_id = public.get_user_tenant_id(auth.uid()));
CREATE POLICY "Tenant admins can manage their technicians" ON public.technicians FOR ALL TO authenticated
  USING (tenant_id = public.get_user_tenant_id(auth.uid()) AND public.has_role(auth.uid(), 'tenant_admin'));

-- RLS: Events
CREATE POLICY "Master admins can manage all events" ON public.events FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'master_admin'));
CREATE POLICY "Tenant users can view their events" ON public.events FOR SELECT TO authenticated
  USING (tenant_id = public.get_user_tenant_id(auth.uid()));
CREATE POLICY "Tenant admins can manage their events" ON public.events FOR ALL TO authenticated
  USING (tenant_id = public.get_user_tenant_id(auth.uid()) AND public.has_role(auth.uid(), 'tenant_admin'));

-- RLS: Event Technicians
CREATE POLICY "Master admins can manage all event_technicians" ON public.event_technicians FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'master_admin'));
CREATE POLICY "Tenant users can view their event_technicians" ON public.event_technicians FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.events e WHERE e.id = event_id AND e.tenant_id = public.get_user_tenant_id(auth.uid())
  ));
CREATE POLICY "Tenant admins can manage their event_technicians" ON public.event_technicians FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.events e WHERE e.id = event_id AND e.tenant_id = public.get_user_tenant_id(auth.uid())
  ) AND public.has_role(auth.uid(), 'tenant_admin'));

-- Triggers
CREATE TRIGGER update_technicians_updated_at BEFORE UPDATE ON public.technicians
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_events_updated_at BEFORE UPDATE ON public.events
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for events
ALTER PUBLICATION supabase_realtime ADD TABLE public.events;
