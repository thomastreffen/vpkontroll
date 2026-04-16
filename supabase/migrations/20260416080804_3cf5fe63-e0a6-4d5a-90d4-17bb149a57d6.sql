ALTER TABLE public.mailboxes
ADD COLUMN sync_from timestamp with time zone NOT NULL DEFAULT now();