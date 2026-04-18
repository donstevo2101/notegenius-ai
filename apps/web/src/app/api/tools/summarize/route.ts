import { transcribeChunk } from "@/lib/whisper";
import { generateSummary } from "@/lib/claude";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const language = formData.get("language") as string | null;

    if (!file) {
      return Response.json(
        { error: "No file provided. Please upload an audio or video file." },
        { status: 400 }
      );
    }

    if (file.size > 25 * 1024 * 1024) {
      return Response.json(
        {
          error: `File is too large (${(file.size / (1024 * 1024)).toFixed(1)} MB). Maximum size is 25 MB.`,
        },
        { status: 400 }
      );
    }

    // Step 1: Transcribe with Whisper
    const blob = new Blob([await file.arrayBuffer()], { type: file.type });
    const segments = await transcribeChunk(blob, language || undefined);
    const text = segments.map((s) => s.text).join(" ");

    if (!text.trim()) {
      return Response.json(
        { error: "No speech detected in the file. Please try a different file." },
        { status: 400 }
      );
    }

    // Step 2: Summarize with Claude
    const summary = await generateSummary(text);

    return Response.json({
      text,
      segments: segments.map((s) => ({
        start: s.start,
        end: s.end,
        text: s.text,
      })),
      summary,
      note: "This is a free tool. Sign up for unlimited access.",
    });
  } catch (err) {
    console.error("Summarize error:", err);
    return Response.json(
      {
        error:
          err instanceof Error
            ? err.message
            : "Summarization failed. Please try again.",
      },
      { status: 500 }
    );
  }
}
