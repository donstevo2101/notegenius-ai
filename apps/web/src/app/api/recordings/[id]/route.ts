import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// GET /api/recordings/[id] — fetch single recording with related data
export async function GET(
  _request: NextRequest,
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

    // Fetch the recording
    const { data: recording, error: recordingError } = await supabase
      .from("recordings")
      .select("*")
      .eq("id", id)
      .eq("user_id", user.id)
      .single();

    if (recordingError || !recording) {
      return NextResponse.json({ error: "Recording not found" }, { status: 404 });
    }

    // Fetch summary
    const { data: summary } = await supabase
      .from("summaries")
      .select("*")
      .eq("recording_id", id)
      .single();

    // Fetch speakers
    const { data: speakers } = await supabase
      .from("speakers")
      .select("*")
      .eq("recording_id", id)
      .order("label", { ascending: true });

    // Get transcript segment count
    const { count: segmentCount } = await supabase
      .from("transcript_segments")
      .select("*", { count: "exact", head: true })
      .eq("recording_id", id);

    return NextResponse.json({
      recording,
      summary: summary || null,
      speakers: speakers || [],
      segment_count: segmentCount || 0,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// PATCH /api/recordings/[id] — update recording
export async function PATCH(
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

    const body = await request.json();
    const { title, participant_emails, speaker_labels } = body as {
      title?: string;
      participant_emails?: string[];
      speaker_labels?: Record<string, string>;
    };

    const updates: Record<string, unknown> = {};
    if (title !== undefined) updates.title = title;
    if (participant_emails !== undefined) updates.participant_emails = participant_emails;

    if (Object.keys(updates).length > 0) {
      const { error } = await supabase
        .from("recordings")
        .update(updates)
        .eq("id", id)
        .eq("user_id", user.id);

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
    }

    // Update speaker labels if provided
    if (speaker_labels) {
      for (const [label, name] of Object.entries(speaker_labels)) {
        await supabase
          .from("speakers")
          .update({ name })
          .eq("recording_id", id)
          .eq("label", label);
      }
    }

    const { data: recording } = await supabase
      .from("recordings")
      .select("*")
      .eq("id", id)
      .eq("user_id", user.id)
      .single();

    return NextResponse.json({ recording });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// DELETE /api/recordings/[id] — delete recording and all related data
export async function DELETE(
  _request: NextRequest,
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
      .select("id")
      .eq("id", id)
      .eq("user_id", user.id)
      .single();

    if (findError || !recording) {
      return NextResponse.json({ error: "Recording not found" }, { status: 404 });
    }

    // Delete storage files
    const storagePath = `${user.id}/${id}`;
    const { data: files } = await supabase.storage
      .from("recordings")
      .list(`${storagePath}/chunks`);

    if (files && files.length > 0) {
      const filePaths = files.map((f) => `${storagePath}/chunks/${f.name}`);
      await supabase.storage.from("recordings").remove(filePaths);
    }

    // Delete related data (cascade should handle this if set up, but be explicit)
    await supabase.from("qa_messages").delete().eq("recording_id", id);
    await supabase.from("summaries").delete().eq("recording_id", id);
    await supabase.from("transcript_segments").delete().eq("recording_id", id);
    await supabase.from("recording_chunks").delete().eq("recording_id", id);
    await supabase.from("speakers").delete().eq("recording_id", id);

    // Delete the recording itself
    const { error: deleteError } = await supabase
      .from("recordings")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);

    if (deleteError) {
      return NextResponse.json({ error: deleteError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
