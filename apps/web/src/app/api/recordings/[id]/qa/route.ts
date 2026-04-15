import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { answerQuestion, type QAMessage } from "@/lib/claude";

// POST /api/recordings/[id]/qa — ask a question about a recording
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

    // Parse request body
    const body = await request.json();
    const { question } = body as { question?: string };

    if (!question || typeof question !== "string" || question.trim().length === 0) {
      return NextResponse.json({ error: "Question is required" }, { status: 400 });
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

    // Fetch transcript segments
    const { data: segments } = await supabase
      .from("transcript_segments")
      .select("text, start_ms, end_ms, speaker_label")
      .eq("recording_id", id)
      .order("start_ms", { ascending: true });

    if (!segments || segments.length === 0) {
      return NextResponse.json(
        { error: "No transcript available for this recording" },
        { status: 400 }
      );
    }

    // Build transcript text
    const transcriptText = segments
      .map((s) => {
        const speaker = s.speaker_label ? `[${s.speaker_label}] ` : "";
        const mins = Math.floor(s.start_ms / 60000);
        const secs = Math.floor((s.start_ms % 60000) / 1000);
        const ts = `[${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}]`;
        return `${ts} ${speaker}${s.text}`;
      })
      .join("\n");

    // Fetch summary for context
    const { data: summary } = await supabase
      .from("summaries")
      .select("overview, action_items, key_decisions, topics, sentiment")
      .eq("recording_id", id)
      .single();

    const summaryText = summary
      ? `Overview: ${summary.overview}\nAction Items: ${(summary.action_items as string[]).join(", ")}\nKey Decisions: ${(summary.key_decisions as string[]).join(", ")}\nTopics: ${(summary.topics as string[]).join(", ")}\nSentiment: ${summary.sentiment}`
      : "No summary available.";

    // Fetch last 5 QA messages for conversation history
    const { data: qaHistory } = await supabase
      .from("qa_messages")
      .select("role, content")
      .eq("recording_id", id)
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(10); // 5 pairs = 10 messages

    const history: QAMessage[] = (qaHistory || [])
      .reverse()
      .map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      }));

    // Get answer from Claude
    const result = await answerQuestion(
      transcriptText,
      summaryText,
      question.trim(),
      history
    );

    // Insert user message
    await supabase.from("qa_messages").insert({
      recording_id: id,
      user_id: user.id,
      role: "user",
      content: question.trim(),
    });

    // Insert assistant response
    await supabase.from("qa_messages").insert({
      recording_id: id,
      user_id: user.id,
      role: "assistant",
      content: result.answer,
      metadata: { referenced_segments: result.referenced_segments },
    });

    return NextResponse.json({
      answer: result.answer,
      referenced_segments: result.referenced_segments,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
