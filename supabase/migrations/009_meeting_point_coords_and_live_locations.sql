-- ============================================
-- Meeting point: tekst → coördinaten
-- ============================================
alter table groups drop column if exists meeting_point;
alter table groups add column if not exists meeting_point_lat double precision;
alter table groups add column if not exists meeting_point_lng double precision;
alter table groups add column if not exists meeting_point_name text;

-- ============================================
-- Live locatie delen (WhatsApp-stijl)
-- ============================================
create table if not exists live_locations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  group_id uuid references groups(id) on delete cascade,
  receiver_id uuid references auth.users(id) on delete cascade,
  latitude double precision not null,
  longitude double precision not null,
  expires_at timestamptz not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table live_locations enable row level security;

create policy "Iedereen kan live locaties zien"
  on live_locations for select using (true);

create policy "Gebruikers kunnen eigen live locaties aanmaken"
  on live_locations for insert with check (auth.uid() = user_id);

create policy "Gebruikers kunnen eigen live locaties bewerken"
  on live_locations for update using (auth.uid() = user_id);

create policy "Gebruikers kunnen eigen live locaties verwijderen"
  on live_locations for delete using (auth.uid() = user_id);

alter publication supabase_realtime add table live_locations;
