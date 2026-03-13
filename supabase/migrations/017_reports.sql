-- 017_reports.sql
-- User report system: users can report other users for review by admins

CREATE TABLE IF NOT EXISTS public.reports (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id      uuid        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  reported_user_id uuid        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  reason           text        NOT NULL CHECK (reason IN ('spam', 'ongepast_gedrag', 'nep_profiel', 'intimidatie', 'andere')),
  description      text,
  status           text        NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'resolved', 'dismissed')),
  admin_notes      text,
  resolved_by      uuid        REFERENCES public.users(id) ON DELETE SET NULL,
  created_at       timestamptz NOT NULL DEFAULT now(),
  resolved_at      timestamptz
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS reports_status_idx ON public.reports(status, created_at DESC);
CREATE INDEX IF NOT EXISTS reports_reported_user_idx ON public.reports(reported_user_id);
CREATE INDEX IF NOT EXISTS reports_reporter_idx ON public.reports(reporter_id);

-- RLS
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

-- Users can create reports (but not report themselves)
CREATE POLICY "Users can create reports"
  ON public.reports FOR INSERT
  WITH CHECK (
    auth.uid() = reporter_id
    AND auth.uid() != reported_user_id
  );

-- Users can view their own submitted reports
CREATE POLICY "Users can view own reports"
  ON public.reports FOR SELECT
  USING (auth.uid() = reporter_id);
