-- ============================================
-- Concert Buddy — Database Schema
-- Voer dit uit in Supabase SQL Editor
-- ============================================

-- 1. USERS (uitgebreid profiel, gekoppeld aan auth.users)
CREATE TABLE public.users (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  display_name TEXT NOT NULL,
  avatar_url TEXT,
  bio TEXT,
  age INTEGER,
  city TEXT,
  vibe_tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. EVENTS (opgeslagen bij eerste groep-aanmaak, ID = Ticketmaster ID)
CREATE TABLE public.events (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  date TIMESTAMPTZ,
  location_name TEXT,
  image_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. GROUPS (buddy-groepen per event)
CREATE TABLE public.groups (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id TEXT REFERENCES public.events(id) ON DELETE CASCADE NOT NULL,
  created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  vibe_focus TEXT,
  max_members INTEGER DEFAULT 6,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. GROUP_MEMBERS (koppeltabel users <-> groups)
CREATE TABLE public.group_members (
  group_id UUID REFERENCES public.groups(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (group_id, user_id)
);

-- 5. MESSAGES (chat berichten per groep)
CREATE TABLE public.messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id UUID REFERENCES public.groups(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);


-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

-- Zet RLS aan op alle tabellen
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- USERS policies
CREATE POLICY "Iedereen kan profielen zien"
  ON public.users FOR SELECT
  USING (true);

CREATE POLICY "Gebruiker kan eigen profiel aanmaken"
  ON public.users FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Gebruiker kan eigen profiel bewerken"
  ON public.users FOR UPDATE
  USING (auth.uid() = id);

-- EVENTS policies
CREATE POLICY "Iedereen kan events zien"
  ON public.events FOR SELECT
  USING (true);

CREATE POLICY "Ingelogde gebruikers kunnen events aanmaken"
  ON public.events FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- GROUPS policies
CREATE POLICY "Iedereen kan groepen zien"
  ON public.groups FOR SELECT
  USING (true);

CREATE POLICY "Ingelogde gebruikers kunnen groepen aanmaken"
  ON public.groups FOR INSERT
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Makers kunnen hun groep bewerken"
  ON public.groups FOR UPDATE
  USING (auth.uid() = created_by);

CREATE POLICY "Makers kunnen hun groep verwijderen"
  ON public.groups FOR DELETE
  USING (auth.uid() = created_by);

-- GROUP_MEMBERS policies
CREATE POLICY "Iedereen kan groepsleden zien"
  ON public.group_members FOR SELECT
  USING (true);

CREATE POLICY "Ingelogde gebruikers kunnen joinen"
  ON public.group_members FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Gebruikers kunnen zichzelf verwijderen uit groep"
  ON public.group_members FOR DELETE
  USING (auth.uid() = user_id);

-- MESSAGES policies
CREATE POLICY "Groepsleden kunnen berichten lezen"
  ON public.messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.group_members
      WHERE group_members.group_id = messages.group_id
      AND group_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Groepsleden kunnen berichten versturen"
  ON public.messages FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.group_members
      WHERE group_members.group_id = messages.group_id
      AND group_members.user_id = auth.uid()
    )
  );


-- ============================================
-- REALTIME inschakelen voor chat
-- ============================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
