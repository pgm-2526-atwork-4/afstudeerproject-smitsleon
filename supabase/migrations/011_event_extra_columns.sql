-- Extra kolommen op events zodat we de volledige Ticketmaster data opslaan
-- en niet meer afhankelijk zijn van de TM API in de frontend.

ALTER TABLE public.events ADD COLUMN IF NOT EXISTS venue_id text;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS city text;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS time text;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS url text;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS latitude double precision;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS longitude double precision;
