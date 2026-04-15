import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { downloadRecording, deleteRecording } from "@/lib/twilio";

function createServiceClient() {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => [],
        setAll: () => {},
      },
    }
  );
}

/**
 * POST /api/twilio/recording-complete
 * Called by Twilio when a call recording is finished.
 * Downloads the audio, uploads to Supabase Storage, and triggers transcription.
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const recordingUrl = formData.get("RecordingUrl") as string | null;
    const recordingSid = formData.get("RecordingSid") as string | null;
    const recordingDuration = formData.get("RecordingDuration") as string | null;
    const callSid = formData.get("CallSid") as string | null;

    if (!recordingUrl || !callSid || !recordingSid) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const supabase = createServiceClient();

    // Find the recording row by call SID
    const { data: recording, error: findError } = await supabase
      .from("recordings")
      .select("id, user_id")
      .eq("twilio_call_sid", callSid)
      .single();

    if (findError || !recording) {
      console.error("Recording not found for CallSid:", callSid, findError?.message);
      return NextResponse.json(
        { error: "Recording not found" },
        { status: 404 }
      );
    }

    // Download the recording WAV from Twilio
    const audioBuffer = await downloadRecording(recordingUrl);

    // Upload to Supabase Storage
    const storagePath = `${recording.user_id}/${recording.id}/merged.wav`;
    const { error: uploadError } = await supabase.storage
      .from("recordings")
      .upload(storagePath, audioBuffer, {
        contentType: "audio/wav",
        upsert: true,
      });

    if (uploadError) {
      console.error("Storage upload failed:", uploadError.message);
      await supabase
        .from("recordings")
        .update({ status: "error", error_message: "Failed to upload audio" })
        .eq("id", recording.id);
      return NextResponse.json(
        { error: "Failed to upload audio" },
        { status: 500 }
      );
    }

    // Update the recording row
    const durationSeconds = recordingDuration
      ? parseInt(recordingDuration, 10)
      : null;

    await supabase
      .from("recordings")
      .update({
        audio_storage_path: storagePath,
        duration_seconds: durationSeconds,
        status: "transcribing",
      })
      .eq("id", recording.id);

    // Delete recording from Twilio to save storage costs
    deleteRecording(recordingSid).catch((err) => {
      console.warn("Failed to delete Twilio recording:", err);
    });

    // Trigger transcription via internal endpoint.
    // We use the service role key in a custom header since there's no user cookie.
    const origin = request.nextUrl.origin;
    fetch(`${origin}/api/recordings/${recording.id}/transcribe`, {
      method: "POST",
      headers: {
        "x-service-key": process.env.SUPABASE_SERVICE_ROLE_KEY || "",
      },
    }).catch((err) => {
      console.error("Failed to trigger transcription:", err);
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Recording complete webhook error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
