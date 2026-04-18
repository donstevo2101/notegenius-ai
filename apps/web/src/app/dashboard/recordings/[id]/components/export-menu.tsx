"use client";

import { Download, FileText, Subtitles, FileJson, FileType } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

interface ExportMenuProps {
  recordingId: string;
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
  {
    label: "Summary (.pdf)",
    format: "pdf",
    icon: FileType,
    description: "Formatted text summary",
  },
] as const;

export function ExportMenu({ recordingId }: ExportMenuProps) {
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
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
