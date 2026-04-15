-- 002_create_recordings.sql
-- Core recordings table

CREATE TABLE IF NOT EXISTS public.recordings (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title               text,
  status              text DEFAULT 'recording'
                        CHECK (status IN ('recording','uploading','processing','transcribing','summarizing','ready','error')),
  source              text DEFAULT 'web'
                        CHECK (source IN ('web','mobile','twilio')),
  language            text DEFAULT 'en',
  duration_seconds    int,
  audio_storage_path  text,
  total_chunks        int DEFAULT 0,
  twilio_call_sid     text UNIQUE,
  twilio_from         text,
  twilio_to           text,
  participant_emails  text[] DEFAULT '{}',
  error_message       text,
  created_at          timestamptz DEFAULT now(),
  finished_at         timestamptz
);

-- Indexes
CREATE INDEX idx_recordings_user_id    ON public.recordings (user_id);
CREATE INDEX idx_recordings_status     ON public.recordings (status);
CREATE INDEX idx_recordings_created_at ON public.recordings (created_at DESC);

-- RLS
ALTER TABLE public.recordings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own recordings"
  ON public.recordings FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own recordings"
  ON public.recordings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own recordings"
  ON public.recordings FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own recordings"
  ON public.recordings FOR DELETE
  USING (auth.uid() = user_id);
