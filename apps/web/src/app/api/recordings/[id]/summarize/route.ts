import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateSummary } from "@/lib/claude";
import { sendSummaryEmail } from "@/lib/resend";

// POST /api/recordings/[id]/summarize — generate AI summary
export async function POST(
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
      .select("id, user_id")
      .eq("id", id)
      .eq("user_id", user.id)
      .single();

    if (findError || !recording) {
      return NextResponse.json({ error: "Recording not found" }, { status: 404 });
    }

    // Fetch all transcript segments
    const { data: segments, error: segmentsError } = await supabase
      .from("transcript_segments")
      .select("text, start_ms, end_ms, speaker_label")
      .eq("recording_id", id)
      .order("start_ms", { ascending: true });

    if (segmentsError || !segments || segments.length === 0) {
      return NextResponse.json(
        { error: "No transcript segments found" },
        { status: 400 }
      );
    }

    // Build the transcript text
    const transcriptText = segments
      .map((s) => {
        const speaker = s.speaker_label ? `[${s.speaker_label}] ` : "";
        const timestamp = formatTimestamp(s.start_ms);
        return `${timestamp} ${speaker}${s.text}`;
      })
      .join("\n");

    // Generate summary via Claude
    const summary = await generateSummary(transcriptText);

    // Insert summary into database
    const { error: insertError } = await supabase.from("summaries").upsert(
      {
        recording_id: id,
        overview: summary.overview,
        action_items: summary.action_items,
        key_decisions: summary.key_decisions,
        topics: summary.topics,
        sentiment: summary.sentiment,
      },
      { onConflict: "recording_id" }
    );

    if (insertError) {
      return NextResponse.json(
        { error: `Failed to save summary: ${insertError.message}` },
        { status: 500 }
      );
    }

    // Update recording status to ready
    await supabase
      .from("recordings")
      .update({ status: "ready" })
      .eq("id", id);

    // Auto-email summary if enabled or if recording has participant emails
    try {
      // Fetch the full recording to get participant_emails and user_id
      const { data: fullRecording } = await supabase
        .from("recordings")
        .select("title, created_at, duration_seconds, participant_emails, user_id")
        .eq("id", id)
        .single();

      // Check if user has auto_email_summaries enabled
      const { data: profile } = await supabase
        .from("profiles")
        .select("auto_email_summaries, email")
        .eq("id", user.id)
        .single();

      const participantEmails = fullRecording?.participant_emails || [];
      const shouldEmail =
        participantEmails.length > 0 ||
        (profile?.auto_email_summaries && profile?.email);

      if (shouldEmail) {
        const emailRecipients = [...participantEmails];
        if (
          profile?.auto_email_summaries &&
          profile?.email &&
          !emailRecipients.includes(profile.email)
        ) {
          emailRecipients.push(profile.email);
        }

        if (emailRecipients.length > 0) {
          const date = new Date(
            fullRecording?.created_at || Date.now()
          ).toLocaleDateString("en-GB", {
            day: "numeric",
            month: "short",
            year: "numeric",
          });

          const durationSec = fullRecording?.duration_seconds || 0;
          const durationStr = durationSec
            ? `${Math.floor(durationSec / 60)}:${String(durationSec % 60).padStart(2, "0")}`
            : "Unknown";

          const origin = _request.nextUrl.origin;

          await sendSummaryEmail(
            emailRecipients,
            {
              title: fullRecording?.title || "Untitled Recording",
              date,
              duration: durationStr,
            },
            {
              overview: summary.overview,
              action_items: summary.action_items,
              key_decisions: summary.key_decisions,
            },
            origin,
            id
          );
        }
      }
    } catch (emailErr) {
      // Email failure is non-critical — log but don't fail the request
      console.error("Failed to send summary email:", emailErr);
    }

    return NextResponse.json({ success: true });
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

function formatTimestamp(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `[${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}]`;
}
