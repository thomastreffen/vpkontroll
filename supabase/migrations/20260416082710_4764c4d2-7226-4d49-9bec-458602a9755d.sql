
ALTER TABLE public.events
ADD COLUMN notification_status text NOT NULL DEFAULT 'none',
ADD COLUMN notified_at timestamptz;
