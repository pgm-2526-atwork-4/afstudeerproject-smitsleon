-- Remove group_requests and related functionality

-- Delete any notifications related to group requests
DELETE FROM public.notifications 
WHERE type IN ('group_request', 'group_request_accepted', 'group_request_declined');

-- Drop the group_requests table
DROP TABLE IF EXISTS public.group_requests;

-- Remove the requires_approval column from the groups table
ALTER TABLE public.groups DROP COLUMN IF EXISTS requires_approval;
