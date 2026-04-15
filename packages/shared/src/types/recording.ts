export type RecordingStatus =
  | "recording"
  | "uploading"
  | "processing"
  | "transcribing"
  | "summarizing"
  | "ready"
  | "error";

export type RecordingSource = "web" | "mobile" | "twilio";

export interface Recording {
  id: string;
  user_id: string;
  title: string | null;
  status: RecordingStatus;
  source: RecordingSource;
  language: string;
  duration_seconds: number | null;
  audio_storage_path: string | null;
  total_chunks: number;
  twilio_call_sid: string | null;
  twilio_from: string | null;
  twilio_to: string | null;
  participant_emails: string[];
  error_message: string | null;
  created_at: string;
  finished_at: string | null;
}

export interface RecordingChunk {
  id: string;
  recording_id: string;
  chunk_index: number;
  storage_path: string;
  duration_seconds: number | null;
  size_bytes: number | null;
  created_at: string;
}
