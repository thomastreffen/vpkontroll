
-- Add user_id column to technicians
ALTER TABLE public.technicians ADD COLUMN IF NOT EXISTS user_id uuid;

-- Create index for fast lookup
CREATE INDEX IF NOT EXISTS idx_technicians_user_id ON public.technicians(user_id) WHERE user_id IS NOT NULL;

-- Auto-match function: when a technician is inserted/updated with an email, try to find matching profile user_id
CREATE OR REPLACE FUNCTION public.auto_link_technician_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only auto-link if user_id is not already set and email is provided
  IF NEW.user_id IS NULL AND NEW.email IS NOT NULL THEN
    SELECT p.user_id INTO NEW.user_id
    FROM public.profiles p
    WHERE p.email = NEW.email AND p.tenant_id = NEW.tenant_id
    LIMIT 1;
  END IF;
  RETURN NEW;
END;
$$;

-- Create trigger for auto-linking
DROP TRIGGER IF EXISTS trg_auto_link_technician ON public.technicians;
CREATE TRIGGER trg_auto_link_technician
  BEFORE INSERT OR UPDATE OF email ON public.technicians
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_link_technician_user();

-- Backfill existing technicians where email matches a profile
UPDATE public.technicians t
SET user_id = p.user_id
FROM public.profiles p
WHERE t.email = p.email
  AND t.tenant_id = p.tenant_id
  AND t.user_id IS NULL
  AND t.email IS NOT NULL;
