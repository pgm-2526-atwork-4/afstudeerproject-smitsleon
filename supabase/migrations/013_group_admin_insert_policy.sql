-- Fix RLS policy for group_members to allow group admins to insert members

CREATE POLICY "Group creators can insert members into their groups"
  ON public.group_members FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.groups
      WHERE groups.id = group_members.group_id
      AND groups.created_by = auth.uid()
    )
  );
