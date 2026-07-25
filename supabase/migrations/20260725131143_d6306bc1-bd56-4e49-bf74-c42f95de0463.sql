
ALTER TABLE public.episodes
  ADD COLUMN IF NOT EXISTS source_url text,
  ADD COLUMN IF NOT EXISTS audio_url text,
  ADD COLUMN IF NOT EXISTS transcript text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS transcript_status text NOT NULL DEFAULT 'ready',
  ADD COLUMN IF NOT EXISTS transcript_error text,
  ADD COLUMN IF NOT EXISTS imported_at timestamptz,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

ALTER TABLE public.podcasts
  ADD COLUMN IF NOT EXISTS rss_url text,
  ADD COLUMN IF NOT EXISTS website_url text,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

CREATE INDEX IF NOT EXISTS episodes_source_url_idx ON public.episodes (source_url);
CREATE INDEX IF NOT EXISTS podcasts_rss_url_idx ON public.podcasts (rss_url);

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS episodes_set_updated_at ON public.episodes;
CREATE TRIGGER episodes_set_updated_at BEFORE UPDATE ON public.episodes
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS podcasts_set_updated_at ON public.podcasts;
CREATE TRIGGER podcasts_set_updated_at BEFORE UPDATE ON public.podcasts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
