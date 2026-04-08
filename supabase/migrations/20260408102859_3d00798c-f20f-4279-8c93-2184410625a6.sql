
-- Extend service_templates
ALTER TABLE public.service_templates
  ADD COLUMN IF NOT EXISTS category TEXT NOT NULL DEFAULT 'service',
  ADD COLUMN IF NOT EXISTS template_key TEXT;

-- Extend service_template_fields
ALTER TABLE public.service_template_fields
  ADD COLUMN IF NOT EXISTS field_key TEXT,
  ADD COLUMN IF NOT EXISTS help_text TEXT,
  ADD COLUMN IF NOT EXISTS is_required BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS default_value JSONB,
  ADD COLUMN IF NOT EXISTS options JSONB;
