import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { transcribeChunk } from "@/lib/whisper";

// POST /api/recordings/[id]/transcribe — transcribe all chunks
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify ownership
    const { data: recording, error: findError } = await supabase
      .from("recordings")
      .select("id, user_id, language")
      .eq("id", id)
      .eq("user_id", user.id)
      .single();

    if (findError || !recording) {
      return NextResponse.json({ error: "Recording not found" }, { status: 404 });
    }

    // Update status to transcribing
    await supabase
      .from("recordings")
      .update({ status: "transcribing" })
      .eq("id", id);

    // Fetch all chunks in order
    const { data: chunks, error: chunksError } = await supabase
      .from("recording_chunks")
      .select("*")
      .eq("recording_id", id)
      .order("chunk_index", { ascending: true });

    if (chunksError || !chunks || chunks.length === 0) {
      await supabase
        .from("recordings")
        .update({ status: "error" })
        .eq("id", id);
      return NextResponse.json(
        { error: "No chunks found for this recording" },
        { status: 400 }
      );
    }

    let totalSegments = 0;

    for (const chunk of chunks) {
      // Download chunk from storage
      const { data: fileData, error: downloadError } = await supabase.storage
        .from("recordings")
        .download(chunk.storage_path);

      if (downloadError || !fileData) {
        console.error(
          `Failed to download chunk ${chunk.chunk_index}:`,
          downloadError
        );
        continue;
      }

      // Transcribe the chunk
      const segments = await transcribeChunk(fileData, recording.language);

      // Adjust timestamps: offset by chunk position (30s per chunk)
      const chunkOffsetMs = chunk.chunk_index * 30000;

      const segmentRows = segments.map((segment, segIdx) => ({
        recording_id: id,
        chunk_index: chunk.chunk_index,
        segment_index: segIdx,
        text: segment.text.trim(),
        start_ms: chunkOffsetMs + Math.round(segment.start * 1000),
        end_ms: chunkOffsetMs + Math.round(segment.end * 1000),
        confidence: segment.avg_logprob ? Math.exp(segment.avg_logprob) : null,
        speaker_label: null,
      }));

      if (segmentRows.length > 0) {
        const { error: insertError } = await supabase
          .from("transcript_segments")
          .insert(segmentRows);

        if (insertError) {
          console.error(
            `Failed to insert segments for chunk ${chunk.chunk_index}:`,
            insertError
          );
        } else {
          totalSegments += segmentRows.length;
        }

        // Broadcast new segments via Realtime for live transcript
        const channel = supabase.channel(`recording:${id}`);
        await channel.send({
          type: "broadcast",
          event: "new_segments",
          payload: {
            segments: segmentRows.map((s) => ({
              id: `${s.chunk_index}-${s.segment_index}`,
              text: s.text,
              start_ms: s.start_ms,
              end_ms: s.end_ms,
              speaker_label: s.speaker_label,
              confidence: s.confidence,
            })),
          },
        });
        await supabase.removeChannel(channel);
      }
    }

    // Update status to summarizing
    await supabase
      .from("recordings")
      .update({ status: "summarizing" })
      .eq("id", id);

    // Trigger summarization
    const baseUrl = request.nextUrl.origin;
    fetch(`${baseUrl}/api/recordings/${id}/summarize`, {
      method: "POST",
      headers: {
        cookie: request.headers.get("cookie") || "",
      },
    }).catch((err) => {
      console.error("Failed to trigger summarization:", err);
    });

    return NextResponse.json({ success: true, segment_count: totalSegments });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error";

    // Try to set error status
    try {
      const { id } = await params;
      const supabase = await createClient();
      await supabase.from("recordings").update({ status: "error" }).eq("id", id);
    } catch {
      // ignore cleanup errors
    }

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
