import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// POST /api/recordings/[id]/finalize — finalize a recording and trigger transcription
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
      .select("id, user_id, total_chunks")
      .eq("id", id)
      .eq("user_id", user.id)
      .single();

    if (findError || !recording) {
      return NextResponse.json({ error: "Recording not found" }, { status: 404 });
    }

    // Calculate total duration from chunks
    const { data: chunks } = await supabase
      .from("recording_chunks")
      .select("duration_ms")
      .eq("recording_id", id);

    const totalDurationMs = chunks
      ? chunks.reduce((sum, c) => sum + (c.duration_ms || 30000), 0)
      : 0;

    // Update recording status
    const { error: updateError } = await supabase
      .from("recordings")
      .update({
        status: "processing",
        finished_at: new Date().toISOString(),
        duration_ms: totalDurationMs,
      })
      .eq("id", id);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    // Trigger transcription asynchronously by calling the transcribe endpoint
    const baseUrl = request.nextUrl.origin;
    fetch(`${baseUrl}/api/recordings/${id}/transcribe`, {
      method: "POST",
      headers: {
        cookie: request.headers.get("cookie") || "",
      },
    }).catch((err) => {
      console.error("Failed to trigger transcription:", err);
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
