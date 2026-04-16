-- Add calendar sync tracking to events
ALTER TABLE public.events
ADD COLUMN calendar_sync_status text NOT NULL DEFAULT 'none',
ADD COLUMN external_calendar_event_id text,
ADD COLUMN calendar_sync_error text;

-- Add index for quick lookup
CREATE INDEX idx_events_calendar_sync ON public.events (calendar_sync_status) WHERE calendar_sync_status != 'none';
