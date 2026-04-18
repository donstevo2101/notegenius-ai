"use client";

import { useState } from "react";
import { Download, FileText, Subtitles, FileJson, FileType, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { createClient } from "@/lib/supabase/client";
import { exportToPDF } from "@/lib/export-pdf";

interface ExportMenuProps {
  recordingId: string;
}

function formatDuration(seconds: number | null | undefined): string {
  if (!seconds) return "0m 0s";
  const totalSeconds = Math.floor(seconds);
  const hrs = Math.floor(totalSeconds / 3600);
  const mins = Math.floor((totalSeconds % 3600) / 60);
  const secs = totalSeconds % 60;
  if (hrs > 0) return `${hrs}h ${mins}m`;
  return `${mins}m ${secs}s`;
}

const exportOptions = [
  {
    label: "Transcript (.txt)",
    format: "txt",
    icon: FileText,
    description: "Plain text with timestamps",
  },
  {
    label: "Subtitles (.srt)",
    format: "srt",
    icon: Subtitles,
    description: "SRT subtitle format",
  },
  {
    label: "Full Data (.json)",
    format: "json",
    icon: FileJson,
    description: "Transcript, summary, speakers",
  },
] as const;

export function ExportMenu({ recordingId }: ExportMenuProps) {
  const [pdfLoading, setPdfLoading] = useState(false);

  const handleExport = (format: string) => {
    const url = `/api/recordings/${recordingId}/export?format=${format}`;
    // Trigger download via hidden anchor
    const a = document.createElement("a");
    a.href = url;
    a.download = "";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handlePdfExport = async () => {
    setPdfLoading(true);
    try {
      const supabase = createClient();

      const [recordingRes, segmentsRes, summaryRes, speakersRes] =
        await Promise.all([
          supabase
            .from("recordings")
            .select("title, created_at, duration_seconds")
            .eq("id", recordingId)
            .single(),
          supabase
            .from("transcript_segments")
            .select("start_ms, end_ms, speaker_index, text")
            .eq("recording_id", recordingId)
            .order("start_ms", { ascending: true }),
          supabase
            .from("summaries")
            .select("overview, action_items")
            .eq("recording_id", recordingId)
            .maybeSingle(),
          supabase
            .from("speakers")
            .select("index, label")
            .eq("recording_id", recordingId)
            .order("index", { ascending: true }),
        ]);

      const recording = recordingRes.data;
      if (!recording) throw new Error("Recording not found");

      exportToPDF({
        title: recording.title || "Untitled Recording",
        date: new Date(recording.created_at).toLocaleDateString("en-GB", {
          day: "numeric",
          month: "short",
          year: "numeric",
        }),
        duration: formatDuration(recording.duration_seconds),
        segments: segmentsRes.data || [],
        summary: summaryRes.data || null,
        speakers: speakersRes.data || [],
      });
    } catch (err) {
      console.error("PDF export failed:", err);
    } finally {
      setPdfLoading(false);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button variant="outline" size="sm" className="gap-1.5">
            <Download className="h-3.5 w-3.5" />
            Export
          </Button>
        }
      />
      <DropdownMenuContent align="end" sideOffset={8}>
        <DropdownMenuLabel>Export Recording</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {exportOptions.map((option) => (
          <DropdownMenuItem
            key={option.format}
            onClick={() => handleExport(option.format)}
          >
            <option.icon className="h-4 w-4" />
            {option.label}
          </DropdownMenuItem>
        ))}
        <DropdownMenuItem onClick={handlePdfExport} disabled={pdfLoading}>
          {pdfLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <FileType className="h-4 w-4" />
          )}
          PDF Report (.pdf)
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
