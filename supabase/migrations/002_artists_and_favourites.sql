-- ============================================
-- Concert Buddy — Artists & Favourite Artists
-- ============================================

-- 1. ARTISTS (cache van Ticketmaster attractions)
CREATE TABLE public.artists (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  image_url TEXT,
  genre TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. FAVOURITE_ARTISTS (koppeltabel users <-> artists)
CREATE TABLE public.favourite_artists (
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  artist_id TEXT REFERENCES public.artists(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (user_id, artist_id)
);

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

ALTER TABLE public.artists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.favourite_artists ENABLE ROW LEVEL SECURITY;

-- ARTISTS policies
CREATE POLICY "Iedereen kan artiesten zien"
  ON public.artists FOR SELECT
  USING (true);

CREATE POLICY "Ingelogde gebruikers kunnen artiesten toevoegen"
  ON public.artists FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Ingelogde gebruikers kunnen artiesten updaten"
  ON public.artists FOR UPDATE
  USING (auth.uid() IS NOT NULL);

-- FAVOURITE_ARTISTS policies
CREATE POLICY "Iedereen kan favorieten zien"
  ON public.favourite_artists FOR SELECT
  USING (true);

CREATE POLICY "Gebruikers kunnen eigen favorieten toevoegen"
  ON public.favourite_artists FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Gebruikers kunnen eigen favorieten verwijderen"
  ON public.favourite_artists FOR DELETE
  USING (auth.uid() = user_id);
