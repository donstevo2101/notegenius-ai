import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { sendSummaryEmail } from "@/lib/resend";

/**
 * POST /api/email
 * Manually send a summary email for a recording.
 * Body: { recordingId: string, emails: string[] }
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const { recordingId, emails } = body as {
      recordingId?: string;
      emails?: string[];
    };

    if (!recordingId || !emails || emails.length === 0) {
      return NextResponse.json(
        { error: "recordingId and emails are required" },
        { status: 400 }
      );
    }

    // Fetch recording (RLS ensures ownership)
    const { data: recording, error: recError } = await supabase
      .from("recordings")
      .select("id, title, created_at, duration_seconds, user_id")
      .eq("id", recordingId)
      .eq("user_id", user.id)
      .single();

    if (recError || !recording) {
      return NextResponse.json(
        { error: "Recording not found" },
        { status: 404 }
      );
    }

    // Fetch summary
    const { data: summary, error: sumError } = await supabase
      .from("summaries")
      .select("overview, action_items, key_decisions")
      .eq("recording_id", recordingId)
      .single();

    if (sumError || !summary) {
      return NextResponse.json(
        { error: "No summary found for this recording. Summarize it first." },
        { status: 400 }
      );
    }

    // Format recording info
    const date = new Date(recording.created_at).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });

    const durationMin = recording.duration_seconds
      ? `${Math.floor(recording.duration_seconds / 60)}:${String(recording.duration_seconds % 60).padStart(2, "0")}`
      : "Unknown";

    const origin = request.nextUrl.origin;

    await sendSummaryEmail(
      emails,
      {
        title: recording.title || "Untitled Recording",
        date,
        duration: durationMin,
      },
      {
        overview: summary.overview,
        action_items: summary.action_items || [],
        key_decisions: summary.key_decisions || [],
      },
      origin,
      recordingId
    );

    return NextResponse.json({ success: true });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
