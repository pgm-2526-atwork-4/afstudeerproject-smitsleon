-- 015_group_member_roles.sql
-- Add role column to group_members to support multiple admins

ALTER TABLE public.group_members
ADD COLUMN IF NOT EXISTS role text NOT NULL DEFAULT 'member'
CHECK (role IN ('member', 'admin'));

-- Promote all existing group creators to admin
UPDATE public.group_members gm
SET role = 'admin'
FROM public.groups g
WHERE gm.group_id = g.id
  AND gm.user_id = g.created_by;

-- Allow group admins to update group settings (title, description, max_members, meeting point)
CREATE POLICY "Groepsbeheerders kunnen groep bewerken"
  ON public.groups FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.group_members
      WHERE group_members.group_id = groups.id
      AND group_members.user_id = auth.uid()
      AND group_members.role = 'admin'
    )
  );

-- Allow group admins to delete the group
CREATE POLICY "Groepsbeheerders kunnen groep verwijderen"
  ON public.groups FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.group_members
      WHERE group_members.group_id = groups.id
      AND group_members.user_id = auth.uid()
      AND group_members.role = 'admin'
    )
  );

-- Allow group admins to remove members from the group
CREATE POLICY "Groepsbeheerders kunnen leden verwijderen"
  ON public.group_members FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.group_members AS admin_check
      WHERE admin_check.group_id = group_members.group_id
      AND admin_check.user_id = auth.uid()
      AND admin_check.role = 'admin'
    )
  );

-- Allow group admins to update member roles
CREATE POLICY "Groepsbeheerders kunnen rollen wijzigen"
  ON public.group_members FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.group_members AS admin_check
      WHERE admin_check.group_id = group_members.group_id
      AND admin_check.user_id = auth.uid()
      AND admin_check.role = 'admin'
    )
  );
