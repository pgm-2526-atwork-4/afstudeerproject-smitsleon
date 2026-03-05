-- Add deleted_at column to messages for soft-delete feature
-- (Skip if already exists)
DO $$ BEGIN
  ALTER TABLE messages ADD COLUMN deleted_at timestamptz DEFAULT null;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

-- Allow users to soft-delete (update) their own messages
CREATE POLICY "Gebruikers kunnen hun eigen berichten bijwerken"
  ON public.messages FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
