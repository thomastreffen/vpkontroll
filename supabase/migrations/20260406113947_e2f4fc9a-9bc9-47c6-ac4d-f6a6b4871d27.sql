
-- Create enum for roles
CREATE TYPE public.app_role AS ENUM ('master_admin', 'tenant_admin', 'user');

-- Create enum for module names
CREATE TYPE public.module_name AS ENUM ('postkontoret', 'ressursplanlegger');

-- Create enum for integration provider
CREATE TYPE public.integration_provider AS ENUM ('microsoft', 'google');

-- Create enum for tenant status
CREATE TYPE public.tenant_status AS ENUM ('active', 'inactive', 'trial', 'suspended');

-- Create enum for credential status
CREATE TYPE public.credential_status AS ENUM ('connected', 'disconnected', 'error', 'pending');

-- Create tenants table
CREATE TABLE public.tenants (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  domain TEXT,
  slug TEXT NOT NULL UNIQUE,
  status public.tenant_status NOT NULL DEFAULT 'trial',
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create tenant_modules table
CREATE TABLE public.tenant_modules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  module_name public.module_name NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT false,
  activated_at TIMESTAMP WITH TIME ZONE,
  deactivated_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, module_name)
);

-- Create tenant_credentials table
CREATE TABLE public.tenant_credentials (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  provider public.integration_provider NOT NULL,
  client_id TEXT,
  client_secret_encrypted TEXT,
  tenant_domain TEXT,
  scopes JSONB DEFAULT '[]',
  status public.credential_status NOT NULL DEFAULT 'disconnected',
  last_verified_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, provider)
);

-- Create profiles table
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE SET NULL,
  full_name TEXT,
  email TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create user_roles table
CREATE TABLE public.user_roles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  UNIQUE(user_id, role)
);

-- Enable RLS on all tables
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer function to check roles (avoids RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Security definer function to get user's tenant_id
CREATE OR REPLACE FUNCTION public.get_user_tenant_id(_user_id UUID)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT tenant_id FROM public.profiles WHERE user_id = _user_id
$$;

-- TENANTS policies
CREATE POLICY "Master admins can do everything on tenants"
  ON public.tenants FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'master_admin'));

CREATE POLICY "Tenant admins can view their own tenant"
  ON public.tenants FOR SELECT
  TO authenticated
  USING (id = public.get_user_tenant_id(auth.uid()) AND public.has_role(auth.uid(), 'tenant_admin'));

-- TENANT_MODULES policies
CREATE POLICY "Master admins can do everything on tenant_modules"
  ON public.tenant_modules FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'master_admin'));

CREATE POLICY "Tenant admins can view their own modules"
  ON public.tenant_modules FOR SELECT
  TO authenticated
  USING (tenant_id = public.get_user_tenant_id(auth.uid()));

-- TENANT_CREDENTIALS policies
CREATE POLICY "Master admins can do everything on tenant_credentials"
  ON public.tenant_credentials FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'master_admin'));

CREATE POLICY "Tenant admins can manage their own credentials"
  ON public.tenant_credentials FOR ALL
  TO authenticated
  USING (tenant_id = public.get_user_tenant_id(auth.uid()) AND public.has_role(auth.uid(), 'tenant_admin'));

-- PROFILES policies
CREATE POLICY "Master admins can view all profiles"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'master_admin'));

CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- USER_ROLES policies
CREATE POLICY "Master admins can do everything on user_roles"
  ON public.user_roles FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'master_admin'));

CREATE POLICY "Users can view their own roles"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Trigger function for updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Apply updated_at triggers
CREATE TRIGGER update_tenants_updated_at
  BEFORE UPDATE ON public.tenants
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_tenant_credentials_updated_at
  BEFORE UPDATE ON public.tenant_credentials
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
