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

interface WhisperVerboseResponse {
  task: string;
  language: string;
  duration: number;
  text: string;
  segments: WhisperSegment[];
}

/**
 * Transcribe a single audio chunk using OpenAI Whisper API.
 * Returns an array of transcript segments with timestamps.
 */
export async function transcribeChunk(
  audioBlob: Blob,
  language?: string
): Promise<WhisperSegment[]> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY environment variable is not set");
  }

  // Check the 25MB file size limit
  if (audioBlob.size > 25 * 1024 * 1024) {
    throw new Error(
      `Audio chunk exceeds 25MB limit (${(audioBlob.size / (1024 * 1024)).toFixed(1)}MB)`
    );
  }

  const formData = new FormData();
  formData.append("file", audioBlob, "audio.webm");
  formData.append("model", "whisper-1");
  formData.append("response_format", "verbose_json");
  formData.append("timestamp_granularities[]", "segment");

  if (language) {
    formData.append("language", language);
  }

  const response = await fetch(
    "https://api.openai.com/v1/audio/transcriptions",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
      body: formData,
    }
  );

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(
      `Whisper API error (${response.status}): ${errorBody}`
    );
  }

  const data = (await response.json()) as WhisperVerboseResponse;
  return data.segments;
}
