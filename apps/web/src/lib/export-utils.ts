export interface ExportSegment {
  id: string;
  start_ms: number;
  end_ms: number;
  speaker_index: number;
  text: string;
}

export interface ExportSpeaker {
  index: number;
  label: string;
}

export interface ExportSummary {
  id: string;
  overview: string;
  action_items: { id: string; text: string; completed: boolean; assignee?: string }[];
  key_decisions: { id: string; text: string; context: string; timestamp_ms?: number }[];
  topics: { id: string; name: string; start_ms: number; end_ms: number }[];
  sentiment: string;
}

export interface ExportRecording {
  id: string;
  title: string;
  created_at: string;
  duration_ms: number;
  status: string;
  source: string;
}

function formatTimestamp(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const hrs = Math.floor(totalSeconds / 3600);
  const mins = Math.floor((totalSeconds % 3600) / 60);
  const secs = totalSeconds % 60;
  return `${String(hrs).padStart(2, "0")}:${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

function formatSrtTimestamp(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const hrs = Math.floor(totalSeconds / 3600);
  const mins = Math.floor((totalSeconds % 3600) / 60);
  const secs = totalSeconds % 60;
  const millis = ms % 1000;
  return `${String(hrs).padStart(2, "0")}:${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")},${String(millis).padStart(3, "0")}`;
}

/**
 * Format transcript as plain text with timestamps and speaker labels.
 */
export function formatTranscriptAsTxt(
  segments: ExportSegment[],
  speakers: ExportSpeaker[]
): string {
  const speakerMap = new Map(speakers.map((s) => [s.index, s.label]));

  const lines = segments.map((seg) => {
    const speaker = speakerMap.get(seg.speaker_index) || `Speaker ${seg.speaker_index + 1}`;
    const timestamp = formatTimestamp(seg.start_ms);
    return `[${timestamp}] ${speaker}: ${seg.text}`;
  });

  return lines.join("\n");
}

/**
 * Format transcript as SRT subtitle format.
 */
export function formatTranscriptAsSrt(segments: ExportSegment[]): string {
  const blocks = segments.map((seg, i) => {
    const index = i + 1;
    const startTime = formatSrtTimestamp(seg.start_ms);
    const endTime = formatSrtTimestamp(seg.end_ms);
    return `${index}\n${startTime} --> ${endTime}\n${seg.text}`;
  });

  return blocks.join("\n\n") + "\n";
}

/**
 * Format full recording data as JSON.
 */
export function formatFullExport(
  recording: ExportRecording,
  segments: ExportSegment[],
  speakers: ExportSpeaker[],
  summary: ExportSummary | null
): string {
  return JSON.stringify(
    {
      recording: {
        id: recording.id,
        title: recording.title,
        created_at: recording.created_at,
        duration_ms: recording.duration_ms,
        status: recording.status,
        source: recording.source,
      },
      speakers,
      transcript: segments.map((seg) => ({
        start_ms: seg.start_ms,
        end_ms: seg.end_ms,
        speaker_index: seg.speaker_index,
        text: seg.text,
      })),
      summary: summary
        ? {
            overview: summary.overview,
            action_items: summary.action_items,
            key_decisions: summary.key_decisions,
            topics: summary.topics,
            sentiment: summary.sentiment,
          }
        : null,
    },
    null,
    2
  );
}

/**
 * Format summary as readable plain text (for the "PDF" export option).
 */
export function formatSummaryAsText(summary: ExportSummary | null): string {
  if (!summary) {
    return "No summary available for this recording.";
  }

  const lines: string[] = [];

  lines.push("MEETING SUMMARY");
  lines.push("=" .repeat(60));
  lines.push("");

  if (summary.overview) {
    lines.push("OVERVIEW");
    lines.push("-".repeat(40));
    lines.push(summary.overview);
    lines.push("");
  }

  if (summary.topics.length > 0) {
    lines.push("TOPICS DISCUSSED");
    lines.push("-".repeat(40));
    summary.topics.forEach((topic, i) => {
      lines.push(`  ${i + 1}. ${topic.name}`);
    });
    lines.push("");
  }

  if (summary.key_decisions.length > 0) {
    lines.push("KEY DECISIONS");
    lines.push("-".repeat(40));
    summary.key_decisions.forEach((decision, i) => {
      lines.push(`  ${i + 1}. ${decision.text}`);
      if (decision.context) {
        lines.push(`     Context: ${decision.context}`);
      }
    });
    lines.push("");
  }

  if (summary.action_items.length > 0) {
    lines.push("ACTION ITEMS");
    lines.push("-".repeat(40));
    summary.action_items.forEach((item, i) => {
      const status = item.completed ? "[x]" : "[ ]";
      const assignee = item.assignee ? ` (${item.assignee})` : "";
      lines.push(`  ${status} ${i + 1}. ${item.text}${assignee}`);
    });
    lines.push("");
  }

  if (summary.sentiment) {
    lines.push(`Sentiment: ${summary.sentiment}`);
    lines.push("");
  }

  return lines.join("\n");
}
