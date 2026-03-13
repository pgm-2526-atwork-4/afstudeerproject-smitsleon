-- 012_group_settings_and_requests.sql

-- Add requires_approval to groups
ALTER TABLE public.groups 
ADD COLUMN IF NOT EXISTS requires_approval boolean DEFAULT false;

-- Create group_requests table
CREATE TABLE IF NOT EXISTS public.group_requests (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL,
  user_id uuid NOT NULL,
  status text DEFAULT 'pending'::text CHECK (status = ANY (ARRAY['pending'::text, 'accepted'::text, 'declined'::text])),
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT group_requests_pkey PRIMARY KEY (id),
  CONSTRAINT group_requests_group_id_fkey FOREIGN KEY (group_id) REFERENCES public.groups(id) ON DELETE CASCADE,
  CONSTRAINT group_requests_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE,
  CONSTRAINT group_requests_unique_active UNIQUE (group_id, user_id)
);

-- Enable RLS
ALTER TABLE public.group_requests ENABLE ROW LEVEL SECURITY;

-- Policies for group_requests
CREATE POLICY "Users can view requests for groups they manage or requested" ON public.group_requests
  FOR SELECT USING (
    auth.uid() = user_id OR 
    auth.uid() IN (SELECT created_by FROM public.groups WHERE id = group_requests.group_id)
  );

CREATE POLICY "Users can insert their own requests" ON public.group_requests
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Group admins can update requests" ON public.group_requests
  FOR UPDATE USING (
    auth.uid() IN (SELECT created_by FROM public.groups WHERE id = group_requests.group_id)
  );

CREATE POLICY "Users can delete their own requests or Group admins can delete" ON public.group_requests
  FOR DELETE USING (
    auth.uid() = user_id OR 
    auth.uid() IN (SELECT created_by FROM public.groups WHERE id = group_requests.group_id)
  );
