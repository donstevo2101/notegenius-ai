-- 008_create_phone_numbers.sql
-- Twilio phone numbers provisioned per user

CREATE TABLE IF NOT EXISTS public.phone_numbers (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  twilio_sid      text UNIQUE NOT NULL,
  phone_number    text NOT NULL,
  friendly_name   text,
  is_active       boolean DEFAULT true,
  created_at      timestamptz DEFAULT now()
);

-- Index
CREATE INDEX idx_phone_numbers_user_id ON public.phone_numbers (user_id);

-- RLS
ALTER TABLE public.phone_numbers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own phone numbers"
  ON public.phone_numbers FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own phone numbers"
  ON public.phone_numbers FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own phone numbers"
  ON public.phone_numbers FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own phone numbers"
  ON public.phone_numbers FOR DELETE
  USING (auth.uid() = user_id);
