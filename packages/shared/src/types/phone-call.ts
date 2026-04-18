export type CallPlatform = "ios" | "android";
export type CallDirection = "incoming" | "outgoing" | "unknown";
export type CallState = "ringing" | "connected" | "ended" | "missed";

export interface PhoneCall {
  id: string;
  user_id: string;
  recording_id: string | null;
  platform: CallPlatform;
  direction: CallDirection;
  state: CallState;
  remote_number: string | null;
  contact_name: string | null;
  started_at: string;
  connected_at: string | null;
  ended_at: string | null;
  duration_seconds: number | null;
  android_audio_path: string | null;
  notes_prompted: boolean;
  notes_added: boolean;
  created_at: string;
}

export interface CallEvent {
  state: CallState;
  direction?: CallDirection;
  remoteNumber?: string | null;
  contactName?: string | null;
  timestamp: number;
}
