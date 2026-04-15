interface ClaudeMessage {
  role: "user" | "assistant";
  content: string;
}

interface ClaudeResponse {
  id: string;
  content: Array<{ type: string; text: string }>;
  model: string;
  stop_reason: string;
  usage: { input_tokens: number; output_tokens: number };
}

export interface SummaryResult {
  overview: string;
  action_items: string[];
  key_decisions: string[];
  topics: string[];
  sentiment: string;
}

export interface QAResult {
  answer: string;
  referenced_segments: Array<{ start_ms: number; end_ms: number; text: string }>;
}

export interface QAMessage {
  role: "user" | "assistant";
  content: string;
}

const CLAUDE_API_URL = "https://api.anthropic.com/v1/messages";
const CLAUDE_MODEL = "claude-sonnet-4-20250514";

async function callClaude(
  systemPrompt: string,
  messages: ClaudeMessage[],
  maxTokens: number = 4096
): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY environment variable is not set");
  }

  const response = await fetch(CLAUDE_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: CLAUDE_MODEL,
      max_tokens: maxTokens,
      system: systemPrompt,
      messages,
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Claude API error (${response.status}): ${errorBody}`);
  }

  const data = (await response.json()) as ClaudeResponse;
  const textBlock = data.content.find((block) => block.type === "text");

  if (!textBlock) {
    throw new Error("No text response from Claude");
  }

  return textBlock.text;
}

/**
 * Generate a structured summary from a transcript.
 */
export async function generateSummary(
  transcript: string
): Promise<SummaryResult> {
  const systemPrompt = `You are a meeting notes assistant. Given a transcript, produce a structured summary.

You MUST respond with valid JSON in exactly this format:
{
  "overview": "A concise 2-3 sentence overview of the meeting/recording",
  "action_items": ["action item 1", "action item 2"],
  "key_decisions": ["decision 1", "decision 2"],
  "topics": ["topic 1", "topic 2"],
  "sentiment": "overall sentiment of the meeting (e.g., positive, neutral, tense, productive)"
}

Rules:
- Be concise but thorough
- Extract ALL action items mentioned, even implied ones
- List key decisions that were made or agreed upon
- Identify the main topics discussed
- Assess the overall tone/sentiment
- If the transcript is short or lacks certain elements, use empty arrays for those fields
- Respond ONLY with the JSON object, no markdown code fences or extra text`;

  const text = await callClaude(systemPrompt, [
    { role: "user", content: `Here is the transcript:\n\n${transcript}` },
  ]);

  try {
    // Strip markdown code fences if Claude includes them despite instructions
    const cleaned = text.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
    return JSON.parse(cleaned) as SummaryResult;
  } catch {
    throw new Error(`Failed to parse summary JSON from Claude response: ${text.slice(0, 200)}`);
  }
}

/**
 * Answer a question about a recording given its transcript, summary, and conversation history.
 */
export async function answerQuestion(
  transcript: string,
  summary: string,
  question: string,
  history: QAMessage[]
): Promise<QAResult> {
  const systemPrompt = `You are an AI assistant that answers questions about a recorded meeting/conversation.

You have access to:
1. The full transcript of the recording
2. A summary of the recording
3. Previous Q&A messages for conversation context

When answering:
- Be specific and reference what was actually said
- If something wasn't discussed, say so clearly
- Reference specific parts of the transcript when relevant

You MUST respond with valid JSON in exactly this format:
{
  "answer": "Your detailed answer to the question",
  "referenced_segments": [
    {"start_ms": 0, "end_ms": 5000, "text": "relevant quote from transcript"}
  ]
}

Rules:
- The answer should be helpful and conversational
- Include referenced_segments only when you can identify specific parts of the transcript
- If no specific segments are relevant, use an empty array for referenced_segments
- Respond ONLY with the JSON object, no markdown code fences or extra text`;

  const messages: ClaudeMessage[] = [];

  // Add context as first user message
  messages.push({
    role: "user",
    content: `Here is the context for our conversation:

TRANSCRIPT:
${transcript}

SUMMARY:
${summary}

Please use this context to answer my questions. Acknowledge that you've received the context.`,
  });

  messages.push({
    role: "assistant",
    content: "I've reviewed the transcript and summary. I'm ready to answer your questions about this recording.",
  });

  // Add conversation history
  for (const msg of history) {
    messages.push({
      role: msg.role,
      content: msg.content,
    });
  }

  // Add the current question
  messages.push({
    role: "user",
    content: question,
  });

  const text = await callClaude(systemPrompt, messages);

  try {
    const cleaned = text.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
    return JSON.parse(cleaned) as QAResult;
  } catch {
    // If parsing fails, return the raw text as the answer
    return {
      answer: text,
      referenced_segments: [],
    };
  }
}
