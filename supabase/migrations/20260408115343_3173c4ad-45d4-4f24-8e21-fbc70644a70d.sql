ALTER TABLE public.documents ADD COLUMN deal_id uuid NULL;

-- Add RLS-compatible foreign key constraint  
-- (no actual FK to avoid composite key issues, just the column)