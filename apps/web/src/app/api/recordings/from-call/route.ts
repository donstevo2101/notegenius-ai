import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// POST /api/recordings/from-call
// body: { phone_call_id, source: 'phone-android'|'phone-notes', title? }
//
// Creates a recording row that the mobile app then uploads audio to and
// kicks off transcription.
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { phone_call_id?: string; source?: string; title?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.phone_call_id || !body.source) {
    return NextResponse.json(
      { error: "phone_call_id and source required" },
      { status: 400 }
    );
  }

  // Verify phone_call ownership
  const { data: phoneCall } = await supabase
    .from("phone_calls")
    .select("id, contact_name, remote_number, started_at")
    .eq("id", body.phone_call_id)
    .eq("user_id", user.id)
    .single();

  if (!phoneCall) {
    return NextResponse.json({ error: "Phone call not found" }, { status: 404 });
  }

  const defaultTitle =
    body.title ||
    (phoneCall.contact_name
      ? `Call with ${phoneCall.contact_name}`
      : phoneCall.remote_number
      ? `Call with ${phoneCall.remote_number}`
      : "Phone call notes");

  const { data: recording, error: insertErr } = await supabase
    .from("recordings")
    .insert({
      user_id: user.id,
      title: defaultTitle,
      status: "uploading",
      source: "mobile",
      created_at: phoneCall.started_at,
    })
    .select("id")
    .single();

  if (insertErr) {
    return NextResponse.json({ error: insertErr.message }, { status: 500 });
  }

  return NextResponse.json({ recording: { id: recording.id } });
}
