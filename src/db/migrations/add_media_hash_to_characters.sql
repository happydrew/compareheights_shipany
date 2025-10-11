ALTER TABLE public.characters
  ADD COLUMN IF NOT EXISTS media_hash TEXT;
