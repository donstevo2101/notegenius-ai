import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// POST /api/recordings/[id]/finalize — mark recording as processing (fast, no heavy work)
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

    const { data: recording, error: findError } = await supabase
      .from("recordings")
      .select("id, user_id, total_chunks")
      .eq("id", id)
      .eq("user_id", user.id)
      .single();

    if (findError || !recording) {
      return NextResponse.json({ error: "Recording not found" }, { status: 404 });
    }

    // Calculate duration from chunks
    const { data: chunks } = await supabase
      .from("recording_chunks")
      .select("duration_seconds")
      .eq("recording_id", id);

    const totalDurationSeconds = chunks
      ? chunks.reduce((sum, c) => sum + (c.duration_seconds || 30), 0)
      : 0;

    // Just update status — transcription will be triggered by the client
    await supabase
      .from("recordings")
      .update({
        status: "processing",
        finished_at: new Date().toISOString(),
        duration_seconds: totalDurationSeconds,
      })
      .eq("id", id);

    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
