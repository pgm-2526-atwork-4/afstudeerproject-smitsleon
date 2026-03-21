-- ============================================
-- Fix FK inconsistentie: auth.users → public.users
-- Migraties 006, 007 en 009 refereerden naar auth.users(id).
-- De juiste referentie is public.users(id) (app-data tabel).
-- ============================================

-- 1. concert_status.user_id  (006_concert_status.sql)
ALTER TABLE concert_status
  DROP CONSTRAINT concert_status_user_id_fkey,
  ADD  CONSTRAINT concert_status_user_id_fkey
       FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

-- 2. notifications.user_id  (007_notifications.sql)
ALTER TABLE notifications
  DROP CONSTRAINT notifications_user_id_fkey,
  ADD  CONSTRAINT notifications_user_id_fkey
       FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

-- 3. live_locations.user_id  (009_meeting_point_coords_and_live_locations.sql)
ALTER TABLE live_locations
  DROP CONSTRAINT live_locations_user_id_fkey,
  ADD  CONSTRAINT live_locations_user_id_fkey
       FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

-- 4. live_locations.receiver_id  (009_meeting_point_coords_and_live_locations.sql)
ALTER TABLE live_locations
  DROP CONSTRAINT live_locations_receiver_id_fkey,
  ADD  CONSTRAINT live_locations_receiver_id_fkey
       FOREIGN KEY (receiver_id) REFERENCES public.users(id) ON DELETE CASCADE;
