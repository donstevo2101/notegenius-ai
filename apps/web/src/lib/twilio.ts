const ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID!;
const AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN!;
const BASE_URL = `https://api.twilio.com/2010-04-01/Accounts/${ACCOUNT_SID}`;

function authHeader(): string {
  return "Basic " + Buffer.from(`${ACCOUNT_SID}:${AUTH_TOKEN}`).toString("base64");
}

async function twilioFetch(
  path: string,
  options: RequestInit = {}
): Promise<Response> {
  const url = path.startsWith("http") ? path : `${BASE_URL}${path}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      Authorization: authHeader(),
      ...options.headers,
    },
  });
  return response;
}

export interface AvailableNumber {
  phone_number: string;
  friendly_name: string;
  locality: string;
  region: string;
  iso_country: string;
}

/**
 * Search for available phone numbers to purchase.
 */
export async function searchAvailableNumbers(
  countryCode: string,
  areaCode?: string
): Promise<AvailableNumber[]> {
  const params = new URLSearchParams({
    VoiceEnabled: "true",
    SmsEnabled: "false",
    PageSize: "10",
  });
  if (areaCode) {
    params.set("AreaCode", areaCode);
  }

  const response = await twilioFetch(
    `/AvailablePhoneNumbers/${countryCode.toUpperCase()}/Local.json?${params.toString()}`
  );

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Twilio search failed (${response.status}): ${body}`);
  }

  const data = await response.json();
  return (data.available_phone_numbers || []).map(
    (n: Record<string, string>) => ({
      phone_number: n.phone_number,
      friendly_name: n.friendly_name,
      locality: n.locality || "",
      region: n.region || "",
      iso_country: n.iso_country || countryCode,
    })
  );
}

export interface ProvisionedNumber {
  sid: string;
  phone_number: string;
  friendly_name: string;
}

export interface AddressInput {
  customerName?: string;
  street?: string;
  city?: string;
  region?: string;
  postalCode?: string;
}

/**
 * Find or create an address on the Twilio account for regulatory compliance.
 */
async function getOrCreateAddress(isoCountry: string, address?: AddressInput): Promise<string> {
  // Check for existing address in this country
  const listResponse = await twilioFetch(
    `/Addresses.json?IsoCountry=${isoCountry.toUpperCase()}`
  );
  if (listResponse.ok) {
    const listData = await listResponse.json();
    if (listData.addresses && listData.addresses.length > 0) {
      return listData.addresses[0].sid;
    }
  }

  // Create a new address from user input
  const addressBody = new URLSearchParams({
    CustomerName: address?.customerName || "NoteGenius AI User",
    Street: address?.street || "Address Required",
    City: address?.city || "London",
    Region: address?.region || address?.city || "London",
    PostalCode: address?.postalCode || "SW1A 1AA",
    IsoCountry: isoCountry.toUpperCase(),
    FriendlyName: "NoteGenius Recording Address",
  });

  const createResponse = await twilioFetch("/Addresses.json", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: addressBody.toString(),
  });

  if (!createResponse.ok) {
    const errorBody = await createResponse.text();
    throw new Error(`Twilio address creation failed (${createResponse.status}): ${errorBody}`);
  }

  const addressData = await createResponse.json();
  return addressData.sid;
}

/**
 * Buy a phone number and configure the voice webhook.
 */
export async function provisionNumber(
  phoneNumber: string,
  webhookUrl: string,
  isoCountry: string = "GB",
  address?: AddressInput
): Promise<ProvisionedNumber> {
  // Get or create an address for regulatory compliance
  const addressSid = await getOrCreateAddress(isoCountry, address);

  const body = new URLSearchParams({
    PhoneNumber: phoneNumber,
    VoiceUrl: webhookUrl,
    VoiceMethod: "POST",
    FriendlyName: "NoteGenius Recording Line",
    AddressSid: addressSid,
  });

  const response = await twilioFetch("/IncomingPhoneNumbers.json", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Twilio provision failed (${response.status}): ${errorBody}`);
  }

  const data = await response.json();
  return {
    sid: data.sid,
    phone_number: data.phone_number,
    friendly_name: data.friendly_name,
  };
}

/**
 * Release (delete) a phone number by its Twilio SID.
 */
export async function releaseNumber(twilioSid: string): Promise<void> {
  const response = await twilioFetch(
    `/IncomingPhoneNumbers/${twilioSid}.json`,
    { method: "DELETE" }
  );

  // 204 = success, Twilio returns no body
  if (!response.ok && response.status !== 204) {
    const errorBody = await response.text();
    throw new Error(`Twilio release failed (${response.status}): ${errorBody}`);
  }
}

/**
 * Download a recording from Twilio as a Buffer.
 * Twilio recording URLs don't include the file extension — append .wav for WAV format.
 */
export async function downloadRecording(
  recordingUrl: string
): Promise<Buffer> {
  // Ensure we request the .wav format
  const url = recordingUrl.endsWith(".wav")
    ? recordingUrl
    : `${recordingUrl}.wav`;

  const response = await fetch(url, {
    headers: { Authorization: authHeader() },
    redirect: "follow",
  });

  if (!response.ok) {
    throw new Error(
      `Failed to download Twilio recording (${response.status}): ${response.statusText}`
    );
  }

  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

/**
 * Delete a recording from Twilio to save storage costs.
 */
export async function deleteRecording(recordingSid: string): Promise<void> {
  const response = await twilioFetch(
    `/Recordings/${recordingSid}.json`,
    { method: "DELETE" }
  );

  if (!response.ok && response.status !== 204) {
    // Non-critical — log but don't throw
    console.warn(
      `Failed to delete Twilio recording ${recordingSid}: ${response.status}`
    );
  }
}
