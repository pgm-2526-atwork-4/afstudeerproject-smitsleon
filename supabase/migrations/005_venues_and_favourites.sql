-- ============================================
-- Concert Buddy — Venues & Favourite Venues
-- ============================================

-- 1. VENUES (cache van Ticketmaster venues)
CREATE TABLE public.venues (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  city TEXT,
  address TEXT,
  image_url TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. FAVOURITE_VENUES (koppeltabel users <-> venues)
CREATE TABLE public.favourite_venues (
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  venue_id TEXT REFERENCES public.venues(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (user_id, venue_id)
);

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

ALTER TABLE public.venues ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.favourite_venues ENABLE ROW LEVEL SECURITY;

-- VENUES policies
CREATE POLICY "Iedereen kan venues zien"
  ON public.venues FOR SELECT
  USING (true);

CREATE POLICY "Ingelogde gebruikers kunnen venues toevoegen"
  ON public.venues FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Ingelogde gebruikers kunnen venues updaten"
  ON public.venues FOR UPDATE
  USING (auth.uid() IS NOT NULL);

-- FAVOURITE_VENUES policies
CREATE POLICY "Iedereen kan venue favorieten zien"
  ON public.favourite_venues FOR SELECT
  USING (true);

CREATE POLICY "Gebruikers kunnen eigen venue favorieten toevoegen"
  ON public.favourite_venues FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Gebruikers kunnen eigen venue favorieten verwijderen"
  ON public.favourite_venues FOR DELETE
  USING (auth.uid() = user_id);
