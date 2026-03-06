-- ============================================
-- PRIVATE MESSAGES table
-- ============================================
CREATE TABLE IF NOT EXISTS public.private_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  receiver_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  content text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz DEFAULT null,
  CONSTRAINT different_users CHECK (sender_id <> receiver_id)
);

-- Indexes for fast lookups
CREATE INDEX idx_private_messages_sender ON public.private_messages(sender_id);
CREATE INDEX idx_private_messages_receiver ON public.private_messages(receiver_id);
CREATE INDEX idx_private_messages_conversation ON public.private_messages(sender_id, receiver_id, created_at DESC);

-- Enable RLS
ALTER TABLE public.private_messages ENABLE ROW LEVEL SECURITY;

-- Only participants can read messages between them
CREATE POLICY "Deelnemers kunnen privéberichten lezen"
  ON public.private_messages FOR SELECT
  USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

-- Only buddies can send messages to each other
CREATE POLICY "Buddies kunnen privéberichten sturen"
  ON public.private_messages FOR INSERT
  WITH CHECK (
    auth.uid() = sender_id
    AND EXISTS (
      SELECT 1 FROM public.buddies
      WHERE (user_id_1 = sender_id AND user_id_2 = receiver_id)
         OR (user_id_1 = receiver_id AND user_id_2 = sender_id)
    )
  );

-- Users can update (soft-delete) their own messages
CREATE POLICY "Gebruikers kunnen hun eigen privéberichten bijwerken"
  ON public.private_messages FOR UPDATE
  USING (auth.uid() = sender_id)
  WITH CHECK (auth.uid() = sender_id);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.private_messages;
