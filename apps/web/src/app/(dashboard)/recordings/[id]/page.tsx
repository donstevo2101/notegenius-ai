import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { RecordingDetailClient } from "./recording-detail-client";

export const dynamic = "force-dynamic";

// Types matching the Supabase schema
interface RecordingRow {
  id: string;
  title: string;
  created_at: string;
  duration_ms: number;
  status: "recording" | "processing" | "ready" | "error";
  source: "web" | "mobile" | "twilio";
  audio_url: string | null;
  user_id: string;
}

interface SpeakerRow {
  index: number;
  label: string;
  recording_id: string;
}

interface TranscriptSegmentRow {
  id: string;
  start_ms: number;
  end_ms: number;
  speaker_index: number;
  text: string;
  recording_id: string;
}

interface SummaryRow {
  id: string;
  overview: string;
  action_items: {
    id: string;
    text: string;
    completed: boolean;
    assignee?: string;
  }[];
  key_decisions: {
    id: string;
    text: string;
    context: string;
    timestamp_ms?: number;
  }[];
  topics: {
    id: string;
    name: string;
    start_ms: number;
    end_ms: number;
  }[];
  sentiment: "positive" | "negative" | "neutral" | "mixed";
  recording_id: string;
}

interface QAMessageRow {
  id: string;
  role: "user" | "assistant";
  content: string;
  created_at: string;
  recording_id: string;
}

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function RecordingDetailPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createClient();

  // Fetch all data in parallel
  const [
    { data: recording, error: recordingError },
    { data: speakers },
    { data: segments },
    { data: summary },
    { data: qaMessages },
  ] = await Promise.all([
    supabase
      .from("recordings")
      .select("*")
      .eq("id", id)
      .single<RecordingRow>(),
    supabase
      .from("speakers")
      .select("*")
      .eq("recording_id", id)
      .order("index", { ascending: true })
      .returns<SpeakerRow[]>(),
    supabase
      .from("transcript_segments")
      .select("*")
      .eq("recording_id", id)
      .order("start_ms", { ascending: true })
      .returns<TranscriptSegmentRow[]>(),
    supabase
      .from("summaries")
      .select("*")
      .eq("recording_id", id)
      .single<SummaryRow>(),
    supabase
      .from("qa_messages")
      .select("*")
      .eq("recording_id", id)
      .order("created_at", { ascending: true })
      .returns<QAMessageRow[]>(),
  ]);

  if (recordingError || !recording) {
    notFound();
  }

  return (
    <RecordingDetailClient
      recording={{
        id: recording.id,
        title: recording.title,
        created_at: recording.created_at,
        duration_ms: recording.duration_ms,
        status: recording.status,
        source: recording.source,
        audio_url: recording.audio_url,
      }}
      speakers={
        speakers?.map((s) => ({ index: s.index, label: s.label })) ?? []
      }
      segments={
        segments?.map((s) => ({
          id: s.id,
          start_ms: s.start_ms,
          end_ms: s.end_ms,
          speaker_index: s.speaker_index,
          text: s.text,
        })) ?? []
      }
      summary={
        summary
          ? {
              id: summary.id,
              overview: summary.overview,
              action_items: summary.action_items,
              key_decisions: summary.key_decisions,
              topics: summary.topics,
              sentiment: summary.sentiment,
            }
          : null
      }
      qaMessages={
        qaMessages?.map((m) => ({
          id: m.id,
          role: m.role,
          content: m.content,
          created_at: m.created_at,
        })) ?? []
      }
    />
  );
}
