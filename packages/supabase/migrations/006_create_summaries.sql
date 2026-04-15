-- 006_create_summaries.sql
-- AI-generated summaries, one per recording

CREATE TABLE IF NOT EXISTS public.summaries (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recording_id      uuid NOT NULL UNIQUE REFERENCES public.recordings(id) ON DELETE CASCADE,
  overview          text,
  action_items      jsonb DEFAULT '[]',
  key_decisions     jsonb DEFAULT '[]',
  topics            jsonb DEFAULT '[]',
  sentiment         text,
  model_used        text,
  prompt_tokens     int,
  completion_tokens int,
  created_at        timestamptz DEFAULT now()
);

-- RLS
ALTER TABLE public.summaries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view summaries of their recordings"
  ON public.summaries FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.recordings r
      WHERE r.id = recording_id AND r.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert summaries for their recordings"
  ON public.summaries FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.recordings r
      WHERE r.id = recording_id AND r.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update summaries of their recordings"
  ON public.summaries FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.recordings r
      WHERE r.id = recording_id AND r.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.recordings r
      WHERE r.id = recording_id AND r.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete summaries of their recordings"
  ON public.summaries FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.recordings r
      WHERE r.id = recording_id AND r.user_id = auth.uid()
    )
  );
