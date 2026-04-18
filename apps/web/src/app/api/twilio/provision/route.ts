import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  searchAvailableNumbers,
  provisionNumber,
  releaseNumber,
} from "@/lib/twilio";

/**
 * POST /api/twilio/provision
 * Search for an available number, buy it, configure the webhook, and save to DB.
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
    const { countryCode, areaCode, address } = body as {
      countryCode?: string;
      areaCode?: string;
      address?: {
        customerName?: string;
        street?: string;
        city?: string;
        region?: string;
        postalCode?: string;
      };
    };

    if (!countryCode) {
      return NextResponse.json(
        { error: "countryCode is required" },
        { status: 400 }
      );
    }

    // Check if user already has an active number
    const { data: existing } = await supabase
      .from("phone_numbers")
      .select("id")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .limit(1);

    if (existing && existing.length > 0) {
      return NextResponse.json(
        { error: "You already have an active phone number. Release it first." },
        { status: 409 }
      );
    }

    // Search for available numbers
    const available = await searchAvailableNumbers(countryCode, areaCode);

    if (available.length === 0) {
      return NextResponse.json(
        { error: "No available numbers found for that country/area code." },
        { status: 404 }
      );
    }

    // Pick the first available number and provision it
    const chosen = available[0];
    const origin = request.nextUrl.origin;
    const webhookUrl = `${origin}/api/twilio/webhook`;

    const provisioned = await provisionNumber(chosen.phone_number, webhookUrl, countryCode, address);

    // Save to database
    const { data: phoneRow, error: insertError } = await supabase
      .from("phone_numbers")
      .insert({
        user_id: user.id,
        twilio_sid: provisioned.sid,
        phone_number: provisioned.phone_number,
        friendly_name: provisioned.friendly_name,
        is_active: true,
      })
      .select()
      .single();

    if (insertError) {
      // Try to release the number since we couldn't save it
      releaseNumber(provisioned.sid).catch(() => {});
      return NextResponse.json(
        { error: `Failed to save phone number: ${insertError.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({ phoneNumber: phoneRow }, { status: 201 });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * DELETE /api/twilio/provision
 * Release a phone number and mark it inactive in the database.
 */
export async function DELETE(request: NextRequest) {
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
    const { phoneNumberId } = body as { phoneNumberId?: string };

    if (!phoneNumberId) {
      return NextResponse.json(
        { error: "phoneNumberId is required" },
        { status: 400 }
      );
    }

    // Fetch the phone number (RLS ensures ownership)
    const { data: phoneNumber, error: findError } = await supabase
      .from("phone_numbers")
      .select("id, twilio_sid, is_active")
      .eq("id", phoneNumberId)
      .eq("user_id", user.id)
      .single();

    if (findError || !phoneNumber) {
      return NextResponse.json(
        { error: "Phone number not found" },
        { status: 404 }
      );
    }

    if (!phoneNumber.is_active) {
      return NextResponse.json(
        { error: "Phone number is already inactive" },
        { status: 400 }
      );
    }

    // Release from Twilio
    await releaseNumber(phoneNumber.twilio_sid);

    // Mark as inactive in DB
    await supabase
      .from("phone_numbers")
      .update({ is_active: false })
      .eq("id", phoneNumberId);

    return NextResponse.json({ success: true });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
