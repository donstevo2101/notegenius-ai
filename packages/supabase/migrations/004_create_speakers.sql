-- 004_create_speakers.sql
-- Speaker diarisation labels per recording

CREATE TABLE IF NOT EXISTS public.speakers (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recording_id    uuid NOT NULL REFERENCES public.recordings(id) ON DELETE CASCADE,
  speaker_index   int NOT NULL,
  label           text,
  created_at      timestamptz DEFAULT now(),

  UNIQUE (recording_id, speaker_index)
);

-- RLS
ALTER TABLE public.speakers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view speakers of their recordings"
  ON public.speakers FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.recordings r
      WHERE r.id = recording_id AND r.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert speakers for their recordings"
  ON public.speakers FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.recordings r
      WHERE r.id = recording_id AND r.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update speakers of their recordings"
  ON public.speakers FOR UPDATE
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

CREATE POLICY "Users can delete speakers of their recordings"
  ON public.speakers FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.recordings r
      WHERE r.id = recording_id AND r.user_id = auth.uid()
    )
  );
