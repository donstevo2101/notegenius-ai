import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  formatTranscriptAsTxt,
  formatTranscriptAsSrt,
  formatFullExport,
  formatSummaryAsText,
} from "@/lib/export-utils";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = request.nextUrl;
    const format = searchParams.get("format") || "txt";

    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify ownership
    const { data: recording, error: recordingError } = await supabase
      .from("recordings")
      .select("*")
      .eq("id", id)
      .eq("user_id", user.id)
      .single();

    if (recordingError || !recording) {
      return NextResponse.json(
        { error: "Recording not found" },
        { status: 404 }
      );
    }

    // Fetch transcript segments
    const { data: segments } = await supabase
      .from("transcript_segments")
      .select("id, start_ms, end_ms, speaker_index, text")
      .eq("recording_id", id)
      .order("start_ms", { ascending: true });

    // Fetch speakers
    const { data: speakers } = await supabase
      .from("speakers")
      .select("index, label")
      .eq("recording_id", id)
      .order("index", { ascending: true });

    // Fetch summary
    const { data: summary } = await supabase
      .from("summaries")
      .select("*")
      .eq("recording_id", id)
      .single();

    const safeSegments = segments || [];
    const safeSpeakers = speakers || [];
    const safeTitle = recording.title || "recording";
    const sanitizedTitle = safeTitle.replace(/[^a-zA-Z0-9_-]/g, "_");

    switch (format) {
      case "txt": {
        const content = formatTranscriptAsTxt(safeSegments, safeSpeakers);
        return new Response(content, {
          headers: {
            "Content-Type": "text/plain; charset=utf-8",
            "Content-Disposition": `attachment; filename="${sanitizedTitle}_transcript.txt"`,
          },
        });
      }

      case "srt": {
        const content = formatTranscriptAsSrt(safeSegments);
        return new Response(content, {
          headers: {
            "Content-Type": "application/x-subrip; charset=utf-8",
            "Content-Disposition": `attachment; filename="${sanitizedTitle}_subtitles.srt"`,
          },
        });
      }

      case "json": {
        const content = formatFullExport(
          recording,
          safeSegments,
          safeSpeakers,
          summary || null
        );
        return new Response(content, {
          headers: {
            "Content-Type": "application/json; charset=utf-8",
            "Content-Disposition": `attachment; filename="${sanitizedTitle}_full.json"`,
          },
        });
      }

      case "pdf": {
        const content = formatSummaryAsText(summary || null);
        return new Response(content, {
          headers: {
            "Content-Type": "text/plain; charset=utf-8",
            "Content-Disposition": `attachment; filename="${sanitizedTitle}_summary.txt"`,
          },
        });
      }

      default:
        return NextResponse.json(
          { error: "Invalid format. Use: txt, srt, json, or pdf" },
          { status: 400 }
        );
    }
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
