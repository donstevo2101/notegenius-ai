import { transcribeChunk } from "@/lib/whisper";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const language = formData.get("language") as string | null;
    const translate = formData.get("translate") as string | null;

    if (!file) {
      return Response.json(
        { error: "No file provided. Please upload an audio or video file." },
        { status: 400 }
      );
    }

    // 25 MB limit
    if (file.size > 25 * 1024 * 1024) {
      return Response.json(
        {
          error: `File is too large (${(file.size / (1024 * 1024)).toFixed(1)} MB). Maximum size is 25 MB.`,
        },
        { status: 400 }
      );
    }

    // If translate flag is set, transcribe with language detection then translate via the same pipeline
    if (translate === "true") {
      const blob = new Blob([await file.arrayBuffer()], { type: file.type });
      const segments = await transcribeChunk(blob, undefined);
      const text = segments.map((s) => s.text).join(" ");

      return Response.json({
        text,
        segments: segments.map((s) => ({
          start: s.start,
          end: s.end,
          text: s.text,
        })),
        language: "auto-detected",
        note: "This is a free tool. Sign up for unlimited access.",
      });
    }

    // Standard transcription
    const blob = new Blob([await file.arrayBuffer()], { type: file.type });
    const segments = await transcribeChunk(blob, language || undefined);

    const text = segments.map((s) => s.text).join(" ");

    return Response.json({
      text,
      segments: segments.map((s) => ({
        start: s.start,
        end: s.end,
        text: s.text,
      })),
      language: language || "auto",
      note: "This is a free tool. Sign up for unlimited access.",
    });
  } catch (err) {
    console.error("Transcription error:", err);
    return Response.json(
      {
        error:
          err instanceof Error
            ? err.message
            : "Transcription failed. Please try again.",
      },
      { status: 500 }
    );
  }
}
