import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";

export const maxDuration = 60;

const AAI_BASE = "https://api.assemblyai.com/v2";

function getAaiKey(): string {
  const key = process.env.ASSEMBLY_AI_API_KEY;
  if (!key) throw new Error("ASSEMBLY_AI_API_KEY is not set");
  return key;
}

function getServiceSupabase() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// POST /api/recordings/[id]/transcribe
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    // Verify user is authenticated
    const userSupabase = await createClient();
    const { data: { user }, error: authError } = await userSupabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Use service role for all data operations (bypasses RLS)
    const supabase = getServiceSupabase();

    const { data: recording } = await supabase
      .from("recordings")
      .select("id, user_id, language")
      .eq("id", id)
      .eq("user_id", user.id)
      .single();

    if (!recording) {
      return NextResponse.json({ error: "Recording not found" }, { status: 404 });
    }

    await supabase.from("recordings").update({ status: "transcribing" }).eq("id", id);

    // Retry up to 3 times with 5s delay — chunks may still be uploading
    let chunks: { id: string; recording_id: string; chunk_index: number; storage_path: string; duration_seconds: number; size_bytes: number }[] | null = null;
    for (let attempt = 0; attempt < 3; attempt++) {
      const { data } = await supabase
        .from("recording_chunks")
        .select("*")
        .eq("recording_id", id)
        .order("chunk_index", { ascending: true });

      if (data && data.length > 0) {
        chunks = data;
        break;
      }

      // Wait 5 seconds before retry
      await new Promise((r) => setTimeout(r, 5000));
    }

    if (!chunks || chunks.length === 0) {
      await supabase.from("recordings").update({ status: "error", error_message: "No chunks found after retries" }).eq("id", id);
      return NextResponse.json({ error: "No chunks found" }, { status: 400 });
    }

    // For each chunk: get signed URL, submit to AssemblyAI, poll, get results
    let totalSegments = 0;

    for (const chunk of chunks) {
      const { data: signedData } = await supabase.storage
        .from("recordings")
        .createSignedUrl(chunk.storage_path, 600);

      if (!signedData?.signedUrl) continue;

      // Submit to AssemblyAI
      const createRes = await fetch(`${AAI_BASE}/transcript`, {
        method: "POST",
        headers: {
          Authorization: getAaiKey(),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          audio_url: signedData.signedUrl,
          speech_models: ["universal-2"],
        }),
      });

      if (!createRes.ok) {
        const err = await createRes.text();
        console.error(`AssemblyAI submit failed for chunk ${chunk.chunk_index}:`, err);
        continue;
      }

      const { id: transcriptId } = await createRes.json();

      // Poll for completion (max 50 seconds to stay under Vercel limit)
      let status = "queued";
      let data: Record<string, unknown> = {};
      const pollStart = Date.now();

      while (status !== "completed" && status !== "error" && Date.now() - pollStart < 50000) {
        await new Promise((r) => setTimeout(r, 3000));
        const pollRes = await fetch(`${AAI_BASE}/transcript/${transcriptId}`, {
          headers: { Authorization: getAaiKey() },
        });
        data = await pollRes.json();
        status = data.status as string;
      }

      if (status !== "completed" || !data.text) {
        console.error(`Chunk ${chunk.chunk_index} transcription failed:`, data.error || "timeout");
        continue;
      }

      // Get sentences
      const sentRes = await fetch(`${AAI_BASE}/transcript/${transcriptId}/sentences`, {
        headers: { Authorization: getAaiKey() },
      });
      const sentData = await sentRes.json();
      const sentences = (sentData.sentences || []) as Array<{
        start: number; end: number; text: string; confidence: number;
      }>;

      const chunkOffsetMs = chunk.chunk_index * 30000;

      let rows;
      if (sentences.length > 0) {
        rows = sentences.map((s, idx) => ({
          recording_id: id,
          segment_index: totalSegments + idx,
          text: s.text,
          start_ms: chunkOffsetMs + Math.round(s.start),
          end_ms: chunkOffsetMs + Math.round(s.end),
          confidence: s.confidence || null,
        }));
      } else {
        rows = [{
          recording_id: id,
          segment_index: totalSegments,
          text: data.text as string,
          start_ms: chunkOffsetMs,
          end_ms: chunkOffsetMs + 30000,
          confidence: null,
        }];
      }

      const { error: insertError } = await supabase.from("transcript_segments").insert(rows);
      if (!insertError) {
        totalSegments += rows.length;
      } else {
        console.error("Segment insert error:", insertError);
      }
    }

    if (totalSegments === 0) {
      await supabase.from("recordings").update({ status: "error", error_message: "No segments transcribed" }).eq("id", id);
      return NextResponse.json({ error: "No segments transcribed" }, { status: 500 });
    }

    await supabase.from("recordings").update({ status: "summarizing" }).eq("id", id);
    return NextResponse.json({ success: true, segments: totalSegments });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Transcription failed";
    try {
      const supabase = await createClient();
      await supabase.from("recordings").update({ status: "error", error_message: message }).eq("id", id);
    } catch {}
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
