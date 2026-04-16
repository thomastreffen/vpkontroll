-- Function to sync tenant modules based on plan
CREATE OR REPLACE FUNCTION public.sync_tenant_modules_to_plan()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  plan_modules text[];
  mod text;
BEGIN
  -- Only sync for active/trial subscriptions
  IF NEW.status NOT IN ('trial', 'active') THEN
    RETURN NEW;
  END IF;

  -- Get included modules from the plan
  SELECT included_modules INTO plan_modules
  FROM public.saas_plans WHERE id = NEW.plan_id;

  IF plan_modules IS NULL THEN
    RETURN NEW;
  END IF;

  -- Activate modules that should be active
  FOREACH mod IN ARRAY plan_modules LOOP
    INSERT INTO public.tenant_modules (tenant_id, module_name, is_active, activated_at)
    VALUES (NEW.tenant_id, mod::module_name, true, now())
    ON CONFLICT (tenant_id, module_name)
    DO UPDATE SET is_active = true, activated_at = now(), deactivated_at = NULL;
  END LOOP;

  -- Deactivate modules NOT in the plan
  UPDATE public.tenant_modules
  SET is_active = false, deactivated_at = now()
  WHERE tenant_id = NEW.tenant_id
    AND is_active = true
    AND module_name::text != ALL(plan_modules);

  RETURN NEW;
END;
$$;

-- Trigger on subscription insert or plan/status change
CREATE TRIGGER trg_sync_modules_on_subscription
AFTER INSERT OR UPDATE OF plan_id, status
ON public.tenant_subscriptions
FOR EACH ROW
EXECUTE FUNCTION public.sync_tenant_modules_to_plan();