-- 007_create_qa_messages.sql
-- Q&A chat messages per recording

CREATE TABLE IF NOT EXISTS public.qa_messages (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recording_id          uuid NOT NULL REFERENCES public.recordings(id) ON DELETE CASCADE,
  user_id               uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role                  text NOT NULL CHECK (role IN ('user', 'assistant')),
  content               text NOT NULL,
  referenced_segments   uuid[] DEFAULT '{}',
  model_used            text,
  created_at            timestamptz DEFAULT now()
);

-- Index for fetching conversation threads
CREATE INDEX idx_qa_messages_recording_created
  ON public.qa_messages (recording_id, created_at);

-- RLS
ALTER TABLE public.qa_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own messages"
  ON public.qa_messages FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own messages"
  ON public.qa_messages FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own messages"
  ON public.qa_messages FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own messages"
  ON public.qa_messages FOR DELETE
  USING (auth.uid() = user_id);
