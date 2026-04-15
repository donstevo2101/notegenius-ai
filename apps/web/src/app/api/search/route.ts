import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// GET /api/search?q=search+term — full-text search across transcripts
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get("q");

    if (!query || query.trim().length === 0) {
      return NextResponse.json({ error: "Search query is required" }, { status: 400 });
    }

    // Format query for PostgreSQL full-text search
    // Convert "word1 word2" to "word1 & word2" for tsquery
    const tsQuery = query
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .join(" & ");

    // Search transcript segments with full-text search
    const { data: results, error: searchError } = await supabase
      .from("transcript_segments")
      .select(
        `
        id,
        text,
        start_ms,
        end_ms,
        speaker_label,
        recording_id,
        recordings!inner (
          id,
          title,
          created_at,
          status,
          user_id
        )
      `
      )
      .eq("recordings.user_id", user.id)
      .textSearch("fts", tsQuery)
      .limit(50);

    if (searchError) {
      // Fallback to ILIKE search if full-text search fails (e.g., fts column not set up)
      const { data: fallbackResults, error: fallbackError } = await supabase
        .from("transcript_segments")
        .select(
          `
          id,
          text,
          start_ms,
          end_ms,
          speaker_label,
          recording_id,
          recordings!inner (
            id,
            title,
            created_at,
            status,
            user_id
          )
        `
        )
        .eq("recordings.user_id", user.id)
        .ilike("text", `%${query.trim()}%`)
        .limit(50);

      if (fallbackError) {
        return NextResponse.json(
          { error: fallbackError.message },
          { status: 500 }
        );
      }

      return NextResponse.json({
        results: (fallbackResults || []).map(formatResult),
        query: query.trim(),
      });
    }

    return NextResponse.json({
      results: (results || []).map(formatResult),
      query: query.trim(),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

function formatResult(row: Record<string, unknown>) {
  const recording = row.recordings as Record<string, unknown> | null;
  return {
    segment_id: row.id,
    text: row.text,
    start_ms: row.start_ms,
    end_ms: row.end_ms,
    speaker_label: row.speaker_label,
    recording: recording
      ? {
          id: recording.id,
          title: recording.title,
          created_at: recording.created_at,
        }
      : null,
  };
}
