import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { generateSummary } from "@/lib/claude";

export const maxDuration = 60;

const AAI_BASE = "https://api.assemblyai.com/v2";
const CHUNK_DURATION_MS = 30000;

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

async function submitChunkToAAI(supabase: ReturnType<typeof getServiceSupabase>, storagePath: string): Promise<string | null> {
  try {
    const { data: signedData } = await supabase.storage
      .from("recordings")
      .createSignedUrl(storagePath, 600);

    if (!signedData?.signedUrl) return null;

    const res = await fetch(`${AAI_BASE}/transcript`, {
      method: "POST",
      headers: { Authorization: getAaiKey(), "Content-Type": "application/json" },
      body: JSON.stringify({ audio_url: signedData.signedUrl, speech_models: ["universal-2"] }),
    });

    if (!res.ok) return null;
    const data = await res.json();
    return data.id || null;
  } catch {
    return null;
  }
}

async function pollAAI(transcriptId: string): Promise<{ status: string; text?: string }> {
  try {
    const res = await fetch(`${AAI_BASE}/transcript/${transcriptId}`, {
      headers: { Authorization: getAaiKey() },
    });
    const data = await res.json();
    return { status: data.status, text: data.text };
  } catch {
    return { status: "error" };
  }
}

async function getAAISentences(transcriptId: string): Promise<Array<{ start: number; end: number; text: string; confidence: number }>> {
  try {
    const res = await fetch(`${AAI_BASE}/transcript/${transcriptId}/sentences`, {
      headers: { Authorization: getAaiKey() },
    });
    const data = await res.json();
    return data.sentences || [];
  } catch {
    return [];
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const startTime = Date.now();

  try {
    const userSupabase = await createClient();
    const { data: { user }, error: authError } = await userSupabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = getServiceSupabase();

    const { data: recording } = await supabase
      .from("recordings")
      .select("id, user_id, status, language, error_message")
      .eq("id", id)
      .eq("user_id", user.id)
      .single();

    if (!recording) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (recording.status === "ready") return NextResponse.json({ status: "ready", done: true });
    if (recording.status === "error") return NextResponse.json({ status: "error", done: true });

    // Get chunks
    const { data: chunks } = await supabase
      .from("recording_chunks")
      .select("chunk_index, storage_path")
      .eq("recording_id", id)
      .order("chunk_index", { ascending: true });

    if (!chunks || chunks.length === 0) {
      return NextResponse.json({ status: "processing", done: false, message: "Waiting for chunks..." });
    }

    // Get existing segments
    const { data: existingSegs } = await supabase
      .from("transcript_segments")
      .select("start_ms")
      .eq("recording_id", id);

    const doneChunks = new Set<number>();
    if (existingSegs) {
      for (const seg of existingSegs) {
        doneChunks.add(Math.floor(seg.start_ms / CHUNK_DURATION_MS));
      }
    }

    const pendingChunks = chunks.filter(c => !doneChunks.has(c.chunk_index));

    // If all chunks transcribed, do summarization
    if (pendingChunks.length === 0) {
      await supabase.from("recordings").update({ status: "summarizing", error_message: null }).eq("id", id);

      const { data: allSegs } = await supabase
        .from("transcript_segments")
        .select("text, start_ms")
        .eq("recording_id", id)
        .order("segment_index", { ascending: true });

      if (allSegs && allSegs.length > 0) {
        try {
          const transcript = allSegs.map(s => {
            const m = Math.floor(s.start_ms / 60000);
            const sec = Math.floor((s.start_ms % 60000) / 1000);
            return `[${m}:${String(sec).padStart(2, "0")}] ${s.text}`;
          }).join("\n");

          const summary = await generateSummary(transcript);
          await supabase.from("summaries").upsert({
            recording_id: id,
            overview: summary.overview,
            action_items: summary.action_items,
            key_decisions: summary.key_decisions,
            topics: summary.topics,
            sentiment: summary.sentiment,
            model_used: "claude-sonnet-4-20250514",
            prompt_tokens: 0, completion_tokens: 0,
          }, { onConflict: "recording_id" });
        } catch (e) {
          console.error("Summary error:", e);
        }
      }

      await supabase.from("recordings").update({ status: "ready", error_message: null }).eq("id", id);
      return NextResponse.json({ status: "ready", done: true });
    }

    // Process the NEXT pending chunk
    const chunk = pendingChunks[0];
    const chunkNum = chunk.chunk_index + 1;
    const totalChunks = chunks.length;
    const doneCount = doneChunks.size;

    await supabase.from("recordings").update({ status: "transcribing", error_message: null }).eq("id", id);

    // Check if we already submitted this chunk (stored as error_message)
    const storedKey = `aai:${chunk.chunk_index}:`;
    let aaiId = "";
    if (recording.error_message?.startsWith(storedKey)) {
      aaiId = recording.error_message.slice(storedKey.length);
    }

    // Submit if not already submitted
    if (!aaiId) {
      aaiId = await submitChunkToAAI(supabase, chunk.storage_path) || "";
      if (!aaiId) {
        return NextResponse.json({
          status: "transcribing", done: false,
          message: `Chunk ${chunkNum}/${totalChunks}: Submitting... (${doneCount} done)`,
        });
      }
      await supabase.from("recordings").update({ error_message: `${storedKey}${aaiId}` }).eq("id", id);
      return NextResponse.json({
        status: "transcribing", done: false,
        message: `Chunk ${chunkNum}/${totalChunks}: Submitted, waiting... (${doneCount} done)`,
      });
    }

    // Poll AAI
    const result = await pollAAI(aaiId);

    if (result.status === "queued" || result.status === "processing") {
      return NextResponse.json({
        status: "transcribing", done: false,
        message: `Chunk ${chunkNum}/${totalChunks}: Transcribing... (${doneCount} done)`,
      });
    }

    if (result.status !== "completed" || !result.text) {
      // Failed — clear ID so next call retries
      await supabase.from("recordings").update({ error_message: null }).eq("id", id);
      return NextResponse.json({
        status: "transcribing", done: false,
        message: `Chunk ${chunkNum}/${totalChunks}: Retrying... (${doneCount} done)`,
      });
    }

    // Success — get sentences and insert
    const sentences = await getAAISentences(aaiId);
    const offset = chunk.chunk_index * CHUNK_DURATION_MS;

    const { count: segCount } = await supabase
      .from("transcript_segments")
      .select("id", { count: "exact", head: true })
      .eq("recording_id", id);

    const baseIdx = segCount || 0;

    const rows = sentences.length > 0
      ? sentences.map((s, i) => ({
          recording_id: id,
          segment_index: baseIdx + i,
          text: s.text,
          start_ms: offset + s.start,
          end_ms: offset + s.end,
          confidence: s.confidence || null,
        }))
      : [{
          recording_id: id,
          segment_index: baseIdx,
          text: result.text,
          start_ms: offset,
          end_ms: offset + CHUNK_DURATION_MS,
          confidence: null,
        }];

    await supabase.from("transcript_segments").insert(rows);
    await supabase.from("recordings").update({ error_message: null }).eq("id", id);

    const newDone = doneCount + 1;
    const remaining = totalChunks - newDone;

    return NextResponse.json({
      status: remaining > 0 ? "transcribing" : "summarizing",
      done: false,
      message: remaining > 0
        ? `Chunk ${chunkNum}/${totalChunks} done! ${remaining} remaining...`
        : `All ${totalChunks} chunks done! Summarizing...`,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Processing failed";
    console.error("Process endpoint error:", msg);
    // DON'T set status to error — let client retry
    return NextResponse.json({ status: "transcribing", done: false, message: `Error: ${msg}. Retrying...` }, { status: 500 });
  }
}
