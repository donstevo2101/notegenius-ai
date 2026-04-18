import { generateSummary } from "@/lib/claude";

/**
 * Extract video ID from various YouTube URL formats.
 */
function extractVideoId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=)([a-zA-Z0-9_-]{11})/,
    /(?:youtu\.be\/)([a-zA-Z0-9_-]{11})/,
    /(?:youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
    /(?:youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/,
    /(?:youtube\.com\/v\/)([a-zA-Z0-9_-]{11})/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}

/**
 * Attempt to fetch YouTube transcript using the innertube API approach.
 * This fetches the auto-generated or manual captions from YouTube.
 */
async function fetchYouTubeTranscript(
  videoId: string
): Promise<{ segments: { start: number; end: number; text: string }[]; text: string } | null> {
  try {
    // Fetch the video page to extract caption track info
    const pageRes = await fetch(
      `https://www.youtube.com/watch?v=${videoId}`,
      {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          "Accept-Language": "en-US,en;q=0.9",
        },
      }
    );

    if (!pageRes.ok) return null;

    const html = await pageRes.text();

    // Extract caption tracks from the page data
    const captionMatch = html.match(
      /"captionTracks":\s*(\[.*?\])/
    );

    if (!captionMatch) return null;

    let captionTracks: { baseUrl: string; languageCode: string; name?: { simpleText?: string } }[];
    try {
      captionTracks = JSON.parse(captionMatch[1]);
    } catch {
      return null;
    }

    if (!captionTracks || captionTracks.length === 0) return null;

    // Prefer English, fall back to first available
    const track =
      captionTracks.find((t) => t.languageCode === "en") ||
      captionTracks[0];

    if (!track?.baseUrl) return null;

    // Fetch the caption XML and request JSON format
    const captionUrl = `${track.baseUrl}&fmt=json3`;
    const captionRes = await fetch(captionUrl);

    if (!captionRes.ok) {
      // Try XML format as fallback
      const xmlRes = await fetch(track.baseUrl);
      if (!xmlRes.ok) return null;

      const xml = await xmlRes.text();
      const segments: { start: number; end: number; text: string }[] = [];

      // Parse simple XML captions
      const regex = /<text start="([^"]*)" dur="([^"]*)"[^>]*>([^<]*)<\/text>/g;
      let match;
      while ((match = regex.exec(xml)) !== null) {
        const start = parseFloat(match[1]);
        const dur = parseFloat(match[2]);
        const text = match[3]
          .replace(/&amp;/g, "&")
          .replace(/&lt;/g, "<")
          .replace(/&gt;/g, ">")
          .replace(/&quot;/g, '"')
          .replace(/&#39;/g, "'")
          .replace(/\n/g, " ")
          .trim();

        if (text) {
          segments.push({ start, end: start + dur, text });
        }
      }

      if (segments.length === 0) return null;
      const text = segments.map((s) => s.text).join(" ");
      return { segments, text };
    }

    const json = await captionRes.json();

    if (!json.events) return null;

    const segments: { start: number; end: number; text: string }[] = [];

    for (const event of json.events) {
      if (!event.segs) continue;
      const text = event.segs
        .map((s: { utf8?: string }) => s.utf8 || "")
        .join("")
        .replace(/\n/g, " ")
        .trim();
      if (!text) continue;

      const startMs = event.tStartMs || 0;
      const durMs = event.dDurationMs || 0;
      segments.push({
        start: startMs / 1000,
        end: (startMs + durMs) / 1000,
        text,
      });
    }

    if (segments.length === 0) return null;
    const text = segments.map((s) => s.text).join(" ");
    return { segments, text };
  } catch (err) {
    console.error("YouTube transcript fetch error:", err);
    return null;
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { url, summarize } = body as { url?: string; summarize?: boolean };

    if (!url || typeof url !== "string") {
      return Response.json(
        { error: "Please provide a valid YouTube URL." },
        { status: 400 }
      );
    }

    const videoId = extractVideoId(url.trim());
    if (!videoId) {
      return Response.json(
        {
          error:
            "Could not extract a video ID from the URL. Please paste a valid YouTube link.",
        },
        { status: 400 }
      );
    }

    // Try to fetch the transcript
    const result = await fetchYouTubeTranscript(videoId);

    if (!result || result.segments.length === 0) {
      return Response.json(
        {
          error:
            "Could not retrieve captions for this video. The video may not have captions available. Try downloading the video and uploading it directly instead.",
        },
        { status: 404 }
      );
    }

    // Optionally summarize
    if (summarize) {
      try {
        const summary = await generateSummary(result.text);
        return Response.json({
          text: result.text,
          segments: result.segments,
          summary,
          videoId,
          note: "This is a free tool. Sign up for unlimited access.",
        });
      } catch (summaryErr) {
        console.error("Summary generation failed:", summaryErr);
        // Return transcript even if summary fails
        return Response.json({
          text: result.text,
          segments: result.segments,
          videoId,
          summaryError: "Summary generation failed, but transcript is available.",
          note: "This is a free tool. Sign up for unlimited access.",
        });
      }
    }

    return Response.json({
      text: result.text,
      segments: result.segments,
      videoId,
      note: "This is a free tool. Sign up for unlimited access.",
    });
  } catch (err) {
    console.error("YouTube route error:", err);
    return Response.json(
      {
        error:
          err instanceof Error
            ? err.message
            : "Failed to process YouTube URL. Please try again.",
      },
      { status: 500 }
    );
  }
}
