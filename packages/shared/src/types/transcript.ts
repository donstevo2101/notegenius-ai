export interface TranscriptSegment {
  id: string;
  recording_id: string;
  speaker_id: string | null;
  segment_index: number;
  start_ms: number;
  end_ms: number;
  text: string;
  confidence: number | null;
  language: string | null;
  created_at: string;
}

export interface Speaker {
  id: string;
  recording_id: string;
  speaker_index: number;
  label: string | null;
}
