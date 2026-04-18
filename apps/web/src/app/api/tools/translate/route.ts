const CLAUDE_API_URL = "https://api.anthropic.com/v1/messages";
const CLAUDE_MODEL = "claude-sonnet-4-20250514";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { text, targetLanguage } = body as {
      text?: string;
      targetLanguage?: string;
    };

    if (!text || typeof text !== "string" || !text.trim()) {
      return Response.json(
        { error: "Please provide text to translate." },
        { status: 400 }
      );
    }

    if (!targetLanguage || typeof targetLanguage !== "string") {
      return Response.json(
        { error: "Please select a target language." },
        { status: 400 }
      );
    }

    // Limit text length for free tool
    if (text.length > 50000) {
      return Response.json(
        {
          error:
            "Text is too long (max 50,000 characters). Sign up for unlimited access.",
        },
        { status: 400 }
      );
    }

    const languageNames: Record<string, string> = {
      en: "English",
      es: "Spanish",
      fr: "French",
      de: "German",
      it: "Italian",
      pt: "Portuguese",
      nl: "Dutch",
      ru: "Russian",
      zh: "Chinese",
      ja: "Japanese",
      ko: "Korean",
      ar: "Arabic",
      hi: "Hindi",
      tr: "Turkish",
      pl: "Polish",
      sv: "Swedish",
      da: "Danish",
      fi: "Finnish",
      no: "Norwegian",
    };

    const targetName = languageNames[targetLanguage] || targetLanguage;

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return Response.json(
        { error: "Server configuration error: missing API key." },
        { status: 500 }
      );
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
        max_tokens: 8192,
        system: `You are a professional translator. Translate the given text into ${targetName}. Preserve the original formatting, paragraphs, and structure. Only output the translated text — no explanations, no notes, no markdown formatting.`,
        messages: [
          {
            role: "user",
            content: text,
          },
        ],
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error("Claude translation error:", errorBody);
      return Response.json(
        { error: "Translation failed. Please try again." },
        { status: 500 }
      );
    }

    const data = await response.json();
    const textBlock = data.content?.find(
      (block: { type: string }) => block.type === "text"
    );

    if (!textBlock) {
      return Response.json(
        { error: "No translation received. Please try again." },
        { status: 500 }
      );
    }

    return Response.json({
      translatedText: textBlock.text,
      sourceLanguage: "auto",
      targetLanguage,
      targetLanguageName: targetName,
      note: "This is a free tool. Sign up for unlimited access.",
    });
  } catch (err) {
    console.error("Translation error:", err);
    return Response.json(
      {
        error:
          err instanceof Error
            ? err.message
            : "Translation failed. Please try again.",
      },
      { status: 500 }
    );
  }
}
