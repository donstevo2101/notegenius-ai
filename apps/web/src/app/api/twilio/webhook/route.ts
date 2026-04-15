import { NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

// Use a service-role client for webhook routes (no user auth cookie).
// Falls back to anon key if service role key is not set.
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
 * POST /api/twilio/webhook
 * Called by Twilio when someone calls a provisioned virtual number.
 * Returns TwiML to record the call.
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const toNumber = formData.get("To") as string | null;
    const fromNumber = formData.get("From") as string | null;
    const callSid = formData.get("CallSid") as string | null;

    if (!toNumber || !callSid) {
      return new Response(
        `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="alice">Sorry, this number is not configured correctly.</Say>
  <Hangup />
</Response>`,
        {
          status: 200,
          headers: { "Content-Type": "text/xml" },
        }
      );
    }

    const supabase = createServiceClient();

    // Look up the phone number to find the owning user
    const { data: phoneNumber, error: lookupError } = await supabase
      .from("phone_numbers")
      .select("id, user_id")
      .eq("phone_number", toNumber)
      .eq("is_active", true)
      .single();

    if (lookupError || !phoneNumber) {
      console.error("Phone number lookup failed:", lookupError?.message || "not found");
      return new Response(
        `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="alice">Sorry, this number is no longer active.</Say>
  <Hangup />
</Response>`,
        {
          status: 200,
          headers: { "Content-Type": "text/xml" },
        }
      );
    }

    // Create a recording row for this call
    const { error: insertError } = await supabase.from("recordings").insert({
      user_id: phoneNumber.user_id,
      title: `Phone Call from ${fromNumber || "Unknown"}`,
      source: "twilio",
      status: "recording",
      language: "en",
      total_chunks: 0,
      twilio_call_sid: callSid,
      twilio_from: fromNumber || null,
      twilio_to: toNumber,
    });

    if (insertError) {
      console.error("Failed to create recording row:", insertError.message);
    }

    // Build the recording status callback URL
    const origin = request.nextUrl.origin;
    const recordingCallbackUrl = `${origin}/api/twilio/recording-complete`;

    // Return TwiML
    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="alice">This call is being recorded for note-taking purposes.</Say>
  <Record maxLength="14400" recordingStatusCallback="${recordingCallbackUrl}" recordingStatusCallbackMethod="POST" trim="trim-silence" />
</Response>`;

    return new Response(twiml, {
      status: 200,
      headers: { "Content-Type": "text/xml" },
    });
  } catch (err) {
    console.error("Twilio webhook error:", err);
    return new Response(
      `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="alice">An error occurred. Please try again later.</Say>
  <Hangup />
</Response>`,
      {
        status: 200,
        headers: { "Content-Type": "text/xml" },
      }
    );
  }
}
