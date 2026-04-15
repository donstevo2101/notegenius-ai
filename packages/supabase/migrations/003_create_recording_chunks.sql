-- 003_create_recording_chunks.sql
-- Audio chunks for streamed/chunked uploads

CREATE TABLE IF NOT EXISTS public.recording_chunks (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recording_id    uuid NOT NULL REFERENCES public.recordings(id) ON DELETE CASCADE,
  chunk_index     int NOT NULL,
  storage_path    text NOT NULL,
  duration_seconds numeric,
  size_bytes      bigint,
  created_at      timestamptz DEFAULT now(),

  UNIQUE (recording_id, chunk_index)
);

-- RLS
ALTER TABLE public.recording_chunks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view chunks of their recordings"
  ON public.recording_chunks FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.recordings r
      WHERE r.id = recording_id AND r.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert chunks for their recordings"
  ON public.recording_chunks FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.recordings r
      WHERE r.id = recording_id AND r.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update chunks of their recordings"
  ON public.recording_chunks FOR UPDATE
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

CREATE POLICY "Users can delete chunks of their recordings"
  ON public.recording_chunks FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.recordings r
      WHERE r.id = recording_id AND r.user_id = auth.uid()
    )
  );
