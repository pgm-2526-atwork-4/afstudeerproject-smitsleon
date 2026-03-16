-- 019_event_artists_and_venue_fk.sql
-- 1. Add FK from events.venue_id to venues.id
-- 2. Create event_artists junction table for many-to-many relationship

-- ============================================
-- FK: events.venue_id → venues.id
-- ============================================

-- Clear orphaned venue_ids that reference non-existent venues
UPDATE public.events
SET venue_id = NULL
WHERE venue_id IS NOT NULL
  AND venue_id NOT IN (SELECT id FROM public.venues);

ALTER TABLE public.events
ADD CONSTRAINT events_venue_id_fkey
FOREIGN KEY (venue_id) REFERENCES public.venues(id) ON DELETE SET NULL;

-- ============================================
-- Junction table: event_artists
-- ============================================

CREATE TABLE IF NOT EXISTS public.event_artists (
  event_id text    NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  artist_id text   NOT NULL REFERENCES public.artists(id) ON DELETE CASCADE,
  PRIMARY KEY (event_id, artist_id)
);

CREATE INDEX IF NOT EXISTS event_artists_artist_idx ON public.event_artists(artist_id);

-- RLS
ALTER TABLE public.event_artists ENABLE ROW LEVEL SECURITY;

-- Everyone can read event_artists (public data)
CREATE POLICY "Anyone can view event artists"
  ON public.event_artists FOR SELECT
  USING (true);

-- Admins can manage event_artists
CREATE POLICY "Admins can insert event artists"
  ON public.event_artists FOR INSERT
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins can delete event artists"
  ON public.event_artists FOR DELETE
  USING (public.is_admin());
