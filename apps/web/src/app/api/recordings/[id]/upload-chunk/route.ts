import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const maxDuration = 60;

// POST /api/recordings/[id]/upload-chunk — upload an audio chunk
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

    // Verify recording ownership
    const { data: recording, error: findError } = await supabase
      .from("recordings")
      .select("id, user_id")
      .eq("id", id)
      .eq("user_id", user.id)
      .single();

    if (findError || !recording) {
      return NextResponse.json({ error: "Recording not found" }, { status: 404 });
    }

    // Parse FormData
    const formData = await request.formData();
    const chunk = formData.get("chunk") as File | null;
    const chunkIndexStr = formData.get("chunk_index") as string | null;

    if (!chunk) {
      return NextResponse.json({ error: "Missing chunk file" }, { status: 400 });
    }

    if (chunkIndexStr === null) {
      return NextResponse.json({ error: "Missing chunk_index" }, { status: 400 });
    }

    const chunkIndex = parseInt(chunkIndexStr, 10);
    if (isNaN(chunkIndex) || chunkIndex < 0) {
      return NextResponse.json({ error: "Invalid chunk_index" }, { status: 400 });
    }

    // Upload to Supabase Storage
    const paddedIndex = String(chunkIndex).padStart(3, "0");
    const storagePath = `${user.id}/${id}/chunks/chunk_${paddedIndex}.webm`;

    const arrayBuffer = await chunk.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const { error: uploadError } = await supabase.storage
      .from("recordings")
      .upload(storagePath, buffer, {
        contentType: "audio/webm",
        upsert: true,
      });

    if (uploadError) {
      return NextResponse.json(
        { error: `Storage upload failed: ${uploadError.message}` },
        { status: 500 }
      );
    }

    // Insert row into recording_chunks
    const { error: insertError } = await supabase
      .from("recording_chunks")
      .insert({
        recording_id: id,
        chunk_index: chunkIndex,
        storage_path: storagePath,
        size_bytes: chunk.size,
        duration_seconds: 30, // 30 second chunks
      });

    if (insertError) {
      return NextResponse.json(
        { error: `Failed to record chunk: ${insertError.message}` },
        { status: 500 }
      );
    }

    // Update total_chunks on the recording
    const { error: updateError } = await supabase.rpc("increment_total_chunks", {
      recording_id: id,
    });

    // Fallback if RPC doesn't exist: do a count-based update
    if (updateError) {
      const { count } = await supabase
        .from("recording_chunks")
        .select("*", { count: "exact", head: true })
        .eq("recording_id", id);

      await supabase
        .from("recordings")
        .update({ total_chunks: count || chunkIndex + 1 })
        .eq("id", id);
    }

    return NextResponse.json({ success: true, chunk_index: chunkIndex });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
