import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { RecordingDetailClient } from "./recording-detail-client";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function RecordingDetailPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createClient();

  // Fetch recording
  const { data: recording, error: recordingError } = await supabase
    .from("recordings")
    .select("id, title, created_at, duration_seconds, status, source, audio_storage_path, error_message")
    .eq("id", id)
    .single();

  if (recordingError || !recording) {
    notFound();
  }

  // Fetch related data in parallel (these won't crash if empty)
  const [
    { data: speakers },
    { data: segments },
    { data: summaries },
    { data: qaMessages },
  ] = await Promise.all([
    supabase
      .from("speakers")
      .select("speaker_index, label")
      .eq("recording_id", id)
      .order("speaker_index", { ascending: true }),
    supabase
      .from("transcript_segments")
      .select("id, start_ms, end_ms, text, confidence")
      .eq("recording_id", id)
      .order("segment_index", { ascending: true }),
    supabase
      .from("summaries")
      .select("id, overview, action_items, key_decisions, topics, sentiment")
      .eq("recording_id", id)
      .limit(1),
    supabase
      .from("qa_messages")
      .select("id, role, content, created_at")
      .eq("recording_id", id)
      .order("created_at", { ascending: true }),
  ]);

  const summary = summaries && summaries.length > 0 ? summaries[0] : null;

  // Generate audio URLs from chunks (no merged file — play chunks sequentially)
  let audioUrl: string | null = null;
  const chunkUrls: string[] = [];

  // Try merged file first
  if (recording.audio_storage_path) {
    const { data: signedData } = await supabase.storage
      .from("recordings")
      .createSignedUrl(recording.audio_storage_path, 3600);
    audioUrl = signedData?.signedUrl || null;
  }

  // If no merged file, get signed URLs for individual chunks
  if (!audioUrl) {
    const { data: chunks } = await supabase
      .from("recording_chunks")
      .select("storage_path, chunk_index")
      .eq("recording_id", id)
      .order("chunk_index", { ascending: true });

    if (chunks && chunks.length > 0) {
      for (const chunk of chunks) {
        const { data: signedData } = await supabase.storage
          .from("recordings")
          .createSignedUrl(chunk.storage_path, 3600);
        if (signedData?.signedUrl) {
          chunkUrls.push(signedData.signedUrl);
        }
      }
      // Use first chunk as the main audio URL for single-source player fallback
      if (chunkUrls.length > 0) {
        audioUrl = chunkUrls[0];
      }
    }
  }

  return (
    <RecordingDetailClient
      recording={{
        id: recording.id,
        title: recording.title || "Untitled Recording",
        created_at: recording.created_at,
        duration_seconds: recording.duration_seconds || 0,
        status: recording.status,
        source: recording.source,
        audio_url: audioUrl,
        chunk_urls: chunkUrls,
      }}
      speakers={
        speakers?.map((s) => ({ index: s.speaker_index, label: s.label || `Speaker ${s.speaker_index}` })) ?? []
      }
      segments={
        segments?.map((s) => ({
          id: s.id,
          start_ms: s.start_ms,
          end_ms: s.end_ms,
          speaker_index: 0,
          text: s.text,
        })) ?? []
      }
      summary={
        summary
          ? {
              id: summary.id,
              overview: summary.overview || "",
              action_items: summary.action_items || [],
              key_decisions: summary.key_decisions || [],
              topics: summary.topics || [],
              sentiment: summary.sentiment || "neutral",
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
