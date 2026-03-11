-- General notifications table (group joins, buddy accepts, etc.)
create table if not exists notifications (
  id         uuid        primary key default gen_random_uuid(),
  user_id    uuid        not null references auth.users(id) on delete cascade,
  type       text        not null,   -- 'buddy_accepted' | 'group_joined'
  title      text        not null,
  body       text        not null,
  data       jsonb,                  -- e.g. { group_id, from_user_id, ... }
  read       boolean     not null default false,
  created_at timestamptz not null default now()
);

-- Index so we can quickly fetch per-user notifications
create index if not exists notifications_user_id_idx on notifications(user_id, created_at desc);

-- RLS
alter table notifications enable row level security;

create policy "Users see their own notifications"
  on notifications for select using (auth.uid() = user_id);

create policy "Anyone can insert notifications"
  on notifications for insert with check (true);

create policy "Users can update their own notifications"
  on notifications for update using (auth.uid() = user_id);
