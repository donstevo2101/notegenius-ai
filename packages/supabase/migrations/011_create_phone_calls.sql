-- 011_create_phone_calls.sql
-- Detected phone calls from device (iOS CallKit / Android TelephonyManager)
-- Distinct from `recordings` (which is the captured audio session).
-- A phone_call may optionally link to a recording when the user adds notes.

CREATE TABLE IF NOT EXISTS public.phone_calls (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  recording_id      uuid REFERENCES public.recordings(id) ON DELETE SET NULL,
  platform          text NOT NULL CHECK (platform IN ('ios','android')),
  direction         text CHECK (direction IN ('incoming','outgoing','unknown')),
  state             text NOT NULL CHECK (state IN ('ringing','connected','ended','missed')),
  remote_number     text,
  contact_name      text,
  started_at        timestamptz NOT NULL DEFAULT now(),
  connected_at     timestamptz,
  ended_at          timestamptz,
  duration_seconds  int,
  android_audio_path text,
  notes_prompted    boolean DEFAULT false,
  notes_added       boolean DEFAULT false,
  created_at        timestamptz DEFAULT now()
);

CREATE INDEX idx_phone_calls_user_id     ON public.phone_calls (user_id);
CREATE INDEX idx_phone_calls_recording   ON public.phone_calls (recording_id);
CREATE INDEX idx_phone_calls_started_at  ON public.phone_calls (started_at DESC);

ALTER TABLE public.phone_calls ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own phone calls"
  ON public.phone_calls FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own phone calls"
  ON public.phone_calls FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own phone calls"
  ON public.phone_calls FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own phone calls"
  ON public.phone_calls FOR DELETE USING (auth.uid() = user_id);

-- Add call detection prefs to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS call_detection_enabled boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS prompt_for_notes_after_call boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS auto_record_android_calls boolean DEFAULT false;
