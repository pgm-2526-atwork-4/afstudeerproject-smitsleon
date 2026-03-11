-- Concert interest / going status per user
create table if not exists concert_status (
  user_id   uuid    not null references auth.users(id) on delete cascade,
  event_id  text    not null references events(id) on delete cascade,
  status    text    not null check (status in ('interested', 'going')),
  created_at timestamptz not null default now(),
  primary key (user_id, event_id)
);

-- RLS
alter table concert_status enable row level security;

-- Anyone can read concert statuses (visible on profiles)
create policy "Concert status is viewable by everyone"
  on concert_status for select using (true);

-- Users can manage their own statuses
create policy "Users can insert own concert status"
  on concert_status for insert with check (auth.uid() = user_id);

create policy "Users can update own concert status"
  on concert_status for update using (auth.uid() = user_id);

create policy "Users can delete own concert status"
  on concert_status for delete using (auth.uid() = user_id);
