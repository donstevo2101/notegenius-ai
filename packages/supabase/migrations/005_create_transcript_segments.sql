-- 005_create_transcript_segments.sql
-- Individual transcript segments with full-text search

CREATE TABLE IF NOT EXISTS public.transcript_segments (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recording_id    uuid NOT NULL REFERENCES public.recordings(id) ON DELETE CASCADE,
  speaker_id      uuid REFERENCES public.speakers(id) ON DELETE SET NULL,
  segment_index   int NOT NULL,
  start_ms        int NOT NULL,
  end_ms          int NOT NULL,
  text            text NOT NULL,
  confidence      numeric,
  language        text,
  created_at      timestamptz DEFAULT now(),

  -- Generated tsvector column for full-text search
  fts             tsvector GENERATED ALWAYS AS (to_tsvector('english', text)) STORED
);

-- Indexes
CREATE INDEX idx_transcript_segments_recording_index
  ON public.transcript_segments (recording_id, segment_index);

CREATE INDEX idx_transcript_segments_fts
  ON public.transcript_segments USING GIN (fts);

-- RLS
ALTER TABLE public.transcript_segments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view segments of their recordings"
  ON public.transcript_segments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.recordings r
      WHERE r.id = recording_id AND r.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert segments for their recordings"
  ON public.transcript_segments FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.recordings r
      WHERE r.id = recording_id AND r.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update segments of their recordings"
  ON public.transcript_segments FOR UPDATE
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

CREATE POLICY "Users can delete segments of their recordings"
  ON public.transcript_segments FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.recordings r
      WHERE r.id = recording_id AND r.user_id = auth.uid()
    )
  );
