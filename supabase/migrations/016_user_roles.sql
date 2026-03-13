-- 016_user_roles.sql
-- Add role column to users to distinguish admins from regular users

ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS role text NOT NULL DEFAULT 'user'
CHECK (role IN ('user', 'admin'));
