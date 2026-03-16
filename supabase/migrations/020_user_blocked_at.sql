-- 020_user_blocked_at.sql
-- Adds a blocked_at column so admins can block user accounts.
-- When blocked_at is NOT NULL the user is considered blocked.

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS blocked_at timestamptz;
