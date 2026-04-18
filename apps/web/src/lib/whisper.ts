export interface WhisperSegment {
  id: number;
  seek: number;
  start: number;
  end: number;
  text: string;
  tokens: number[];
  temperature: number;
  avg_logprob: number;
  compression_ratio: number;
  no_speech_prob: number;
}

const AAI_BASE = "https://api.assemblyai.com/v2";

function getApiKey(): string {
  const apiKey = process.env.ASSEMBLY_AI_API_KEY;
  if (!apiKey) throw new Error("ASSEMBLY_AI_API_KEY is not set");
  return apiKey;
}

async function aaiFetch(path: string, options: RequestInit = {}) {
  return fetch(`${AAI_BASE}${path}`, {
    ...options,
    headers: {
      Authorization: getApiKey(),
      "Content-Type": "application/json",
      ...options.headers,
    },
  });
}

/**
 * Transcribe audio using a public URL (e.g. Supabase signed URL).
 */
export async function transcribeFromUrl(
  audioUrl: string,
  language?: string
): Promise<WhisperSegment[]> {
  return transcribeWithAssemblyAI(audioUrl, language);
}

/**
 * Transcribe audio from a Blob (uploads to AssemblyAI first).
 */
export async function transcribeChunk(
  audioBlob: Blob,
  language?: string
): Promise<WhisperSegment[]> {
  const arrayBuffer = await audioBlob.arrayBuffer();

  // Upload raw bytes — AssemblyAI expects raw binary with no Content-Type override
  const uploadRes = await fetch(`${AAI_BASE}/upload`, {
    method: "POST",
    headers: {
      Authorization: getApiKey(),
    },
    body: new Uint8Array(arrayBuffer),
  });

  if (!uploadRes.ok) {
    const err = await uploadRes.text();
    throw new Error(`AssemblyAI upload failed (${uploadRes.status}): ${err}`);
  }

  const { upload_url } = await uploadRes.json();
  return transcribeWithAssemblyAI(upload_url, language);
}

async function transcribeWithAssemblyAI(
  audioUrl: string,
  language?: string
): Promise<WhisperSegment[]> {
  // Create transcript
  const body: Record<string, unknown> = {
    audio_url: audioUrl,
    speech_models: ["universal-2"],
  };
  if (language && language !== "en") {
    body.language_code = language;
  }

  const createRes = await aaiFetch("/transcript", {
    method: "POST",
    body: JSON.stringify(body),
  });

  if (!createRes.ok) {
    const err = await createRes.text();
    throw new Error(`AssemblyAI transcript creation failed: ${err}`);
  }

  const { id: transcriptId } = await createRes.json();

  // Poll until complete (max 5 min)
  const maxWait = 300_000;
  const start = Date.now();
  let data: Record<string, unknown> = {};
  let status = "queued";

  while (status !== "completed" && status !== "error" && Date.now() - start < maxWait) {
    await new Promise((r) => setTimeout(r, 3000));
    const pollRes = await aaiFetch(`/transcript/${transcriptId}`, {
      method: "GET",
    });
    data = await pollRes.json();
    status = data.status as string;
  }

  if (status === "error") throw new Error(`Transcription failed: ${data.error}`);
  if (status !== "completed") throw new Error("Transcription timed out");
  if (!data.text) return [];

  // Get sentences
  const sentRes = await aaiFetch(`/transcript/${transcriptId}/sentences`, { method: "GET" });
  const sentData = await sentRes.json();
  const sentences = (sentData.sentences || []) as Array<{
    start: number; end: number; text: string; confidence: number;
  }>;

  if (sentences.length === 0) {
    return [{
      id: 0, seek: 0,
      start: 0, end: (data.audio_duration as number) || 30,
      text: data.text as string,
      tokens: [], temperature: 0, avg_logprob: -0.3, compression_ratio: 1, no_speech_prob: 0,
    }];
  }

  return sentences.map((s, idx) => ({
    id: idx, seek: 0,
    start: s.start / 1000,
    end: s.end / 1000,
    text: s.text,
    tokens: [], temperature: 0,
    avg_logprob: s.confidence ? Math.log(s.confidence) : -0.3,
    compression_ratio: 1, no_speech_prob: 0,
  }));
}
