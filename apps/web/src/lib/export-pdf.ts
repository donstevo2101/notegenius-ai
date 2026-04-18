import { jsPDF } from "jspdf";

interface TranscriptSegment {
  start_ms: number;
  end_ms: number;
  speaker_index: number;
  text: string;
}

interface ActionItem {
  text: string;
  completed?: boolean;
  done?: boolean;
  assignee?: string;
}

interface ExportData {
  title: string;
  date: string;
  duration: string;
  segments: TranscriptSegment[];
  summary?: {
    overview: string;
    action_items?: ActionItem[];
  } | null;
  speakers?: { index: number; label: string }[];
}

function formatTimestamp(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const hrs = Math.floor(totalSeconds / 3600);
  const mins = Math.floor((totalSeconds % 3600) / 60);
  const secs = totalSeconds % 60;
  const pad = (n: number) => n.toString().padStart(2, "0");
  if (hrs > 0) return `${pad(hrs)}:${pad(mins)}:${pad(secs)}`;
  return `${pad(mins)}:${pad(secs)}`;
}

function getSpeakerLabel(
  index: number,
  speakers?: { index: number; label: string }[]
): string {
  const speaker = speakers?.find((s) => s.index === index);
  return speaker?.label || `Speaker ${index + 1}`;
}

export function exportToPDF(data: ExportData) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  const contentWidth = pageWidth - margin * 2;
  let y = 0;
  let pageNumber = 1;

  function addPageNumber() {
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(
      `Page ${pageNumber}`,
      pageWidth / 2,
      pageHeight - 10,
      { align: "center" }
    );
    doc.text("NoteGenius AI", pageWidth - margin, pageHeight - 10, {
      align: "right",
    });
  }

  function checkPageBreak(needed: number) {
    if (y + needed > pageHeight - 20) {
      addPageNumber();
      doc.addPage();
      pageNumber++;
      y = 20;
    }
  }

  // — Header —
  doc.setFillColor(30, 58, 138); // dark blue
  doc.rect(0, 0, pageWidth, 32, "F");

  doc.setFontSize(18);
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.text("NoteGenius AI", margin, 14);

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text("Meeting Transcript & Summary", margin, 22);

  const now = new Date().toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  doc.setFontSize(8);
  doc.text(`Exported ${now}`, pageWidth - margin, 22, { align: "right" });

  y = 42;

  // — Meeting Metadata —
  doc.setFontSize(11);
  doc.setTextColor(30, 58, 138);
  doc.setFont("helvetica", "bold");
  doc.text(data.title, margin, y);
  y += 7;

  doc.setFontSize(9);
  doc.setTextColor(100, 100, 100);
  doc.setFont("helvetica", "normal");
  doc.text(`Date: ${data.date}    Duration: ${data.duration}`, margin, y);
  y += 4;

  // thin separator
  doc.setDrawColor(220, 220, 220);
  doc.setLineWidth(0.3);
  doc.line(margin, y, pageWidth - margin, y);
  y += 8;

  // — AI Summary —
  if (data.summary?.overview) {
    doc.setFontSize(12);
    doc.setTextColor(30, 58, 138);
    doc.setFont("helvetica", "bold");
    doc.text("AI Summary", margin, y);
    y += 6;

    doc.setFontSize(9);
    doc.setTextColor(50, 50, 50);
    doc.setFont("helvetica", "normal");
    const summaryLines = doc.splitTextToSize(data.summary.overview, contentWidth);
    for (const line of summaryLines) {
      checkPageBreak(5);
      doc.text(line, margin, y);
      y += 4.5;
    }
    y += 4;
  }

  // — Action Items —
  if (data.summary?.action_items && data.summary.action_items.length > 0) {
    checkPageBreak(14);
    doc.setFontSize(12);
    doc.setTextColor(30, 58, 138);
    doc.setFont("helvetica", "bold");
    doc.text("Action Items", margin, y);
    y += 6;

    doc.setFontSize(9);
    doc.setTextColor(50, 50, 50);
    doc.setFont("helvetica", "normal");

    for (const item of data.summary.action_items) {
      checkPageBreak(6);
      const checked = item.completed || item.done;
      const prefix = checked ? "[x] " : "[ ] ";
      const assignee = item.assignee ? ` (${item.assignee})` : "";
      const itemLines = doc.splitTextToSize(
        `${prefix}${item.text}${assignee}`,
        contentWidth - 4
      );
      for (const line of itemLines) {
        checkPageBreak(5);
        doc.text(line, margin + 4, y);
        y += 4.5;
      }
    }
    y += 4;
  }

  // — Separator before transcript —
  if (data.segments.length > 0) {
    checkPageBreak(14);
    doc.setDrawColor(220, 220, 220);
    doc.setLineWidth(0.3);
    doc.line(margin, y, pageWidth - margin, y);
    y += 8;

    doc.setFontSize(12);
    doc.setTextColor(30, 58, 138);
    doc.setFont("helvetica", "bold");
    doc.text("Full Transcript", margin, y);
    y += 7;

    let lastSpeaker = -1;

    for (const seg of data.segments) {
      const speaker = getSpeakerLabel(seg.speaker_index, data.speakers);
      const timestamp = formatTimestamp(seg.start_ms);
      const showSpeakerHeader = seg.speaker_index !== lastSpeaker;
      lastSpeaker = seg.speaker_index;

      if (showSpeakerHeader) {
        checkPageBreak(12);
        doc.setFontSize(9);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(30, 58, 138);
        doc.text(`${speaker}`, margin, y);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(150, 150, 150);
        doc.text(timestamp, margin + doc.getTextWidth(`${speaker}  `), y);
        y += 5;
      }

      doc.setFontSize(9);
      doc.setTextColor(50, 50, 50);
      doc.setFont("helvetica", "normal");
      const textLines = doc.splitTextToSize(seg.text, contentWidth - 6);
      for (const line of textLines) {
        checkPageBreak(5);
        doc.text(line, margin + 4, y);
        y += 4.5;
      }
      y += 1.5;
    }
  }

  addPageNumber();

  // Save file
  const safeTitle = data.title.replace(/[^a-zA-Z0-9 ]/g, "").trim() || "recording";
  doc.save(`${safeTitle} - NoteGenius.pdf`);
}
