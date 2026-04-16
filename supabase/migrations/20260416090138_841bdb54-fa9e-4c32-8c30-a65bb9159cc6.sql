
-- Subscription status enum
CREATE TYPE public.subscription_status AS ENUM ('trial', 'active', 'paused', 'expired', 'cancelled');

-- SaaS Plans table
CREATE TABLE public.saas_plans (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  price_monthly NUMERIC DEFAULT 0,
  price_yearly NUMERIC DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'NOK',
  trial_days INTEGER NOT NULL DEFAULT 14,
  included_modules TEXT[] NOT NULL DEFAULT '{}',
  max_users INTEGER,
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_visible BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.saas_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Master admins can manage all plans"
  ON public.saas_plans FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'master_admin'::app_role));

-- Tenant Subscriptions table
CREATE TABLE public.tenant_subscriptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  plan_id UUID NOT NULL REFERENCES public.saas_plans(id),
  status subscription_status NOT NULL DEFAULT 'trial',
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  trial_ends_at TIMESTAMP WITH TIME ZONE,
  billing_starts_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE,
  converted_at TIMESTAMP WITH TIME ZONE,
  cancelled_at TIMESTAMP WITH TIME ZONE,
  source TEXT DEFAULT 'manual',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (tenant_id)
);

ALTER TABLE public.tenant_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Master admins can manage all subscriptions"
  ON public.tenant_subscriptions FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'master_admin'::app_role));

CREATE POLICY "Tenant users can view own subscription"
  ON public.tenant_subscriptions FOR SELECT TO authenticated
  USING (tenant_id = get_user_tenant_id(auth.uid()));

-- Triggers for updated_at
CREATE TRIGGER update_saas_plans_updated_at
  BEFORE UPDATE ON public.saas_plans
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_tenant_subscriptions_updated_at
  BEFORE UPDATE ON public.tenant_subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
