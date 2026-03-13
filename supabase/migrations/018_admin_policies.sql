-- 018_admin_policies.sql
-- Admin-specific RLS policies and helper function

-- Helper function: check if current user is an admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid()
      AND role = 'admin'
  );
$$;

-- ============================================
-- REPORTS: admin policies
-- ============================================

-- Admins can view all reports
CREATE POLICY "Admins can view all reports"
  ON public.reports FOR SELECT
  USING (public.is_admin());

-- Admins can update reports (change status, add notes)
CREATE POLICY "Admins can update reports"
  ON public.reports FOR UPDATE
  USING (public.is_admin());

-- ============================================
-- EVENTS: admin CRUD policies
-- ============================================

-- Admins can insert events
CREATE POLICY "Admins can insert events"
  ON public.events FOR INSERT
  WITH CHECK (public.is_admin());

-- Admins can update events
CREATE POLICY "Admins can update events"
  ON public.events FOR UPDATE
  USING (public.is_admin());

-- Admins can delete events
CREATE POLICY "Admins can delete events"
  ON public.events FOR DELETE
  USING (public.is_admin());

-- ============================================
-- ARTISTS: admin CRUD policies
-- ============================================

-- Admins can insert artists
CREATE POLICY "Admins can insert artists"
  ON public.artists FOR INSERT
  WITH CHECK (public.is_admin());

-- Admins can update artists
CREATE POLICY "Admins can update artists"
  ON public.artists FOR UPDATE
  USING (public.is_admin());

-- Admins can delete artists
CREATE POLICY "Admins can delete artists"
  ON public.artists FOR DELETE
  USING (public.is_admin());

-- ============================================
-- VENUES: admin CRUD policies
-- ============================================

-- Admins can insert venues
CREATE POLICY "Admins can insert venues"
  ON public.venues FOR INSERT
  WITH CHECK (public.is_admin());

-- Admins can update venues
CREATE POLICY "Admins can update venues"
  ON public.venues FOR UPDATE
  USING (public.is_admin());

-- Admins can delete venues
CREATE POLICY "Admins can delete venues"
  ON public.venues FOR DELETE
  USING (public.is_admin());

-- ============================================
-- USERS: admin update policy
-- ============================================

-- Admins can update any user (for role changes, bans, etc.)
CREATE POLICY "Admins can update any user"
  ON public.users FOR UPDATE
  USING (public.is_admin());
