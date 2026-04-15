"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Globe,
  Smartphone,
  Phone,
  Pencil,
  Check,
  X,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { AudioPlayer } from "./components/audio-player";
import {
  TranscriptViewer,
  type TranscriptSegment,
  type Speaker as TranscriptSpeaker,
} from "./components/transcript-viewer";
import { SummaryPanel, type Summary } from "./components/summary-panel";
import { QAChat, type QAMessage } from "./components/qa-chat";
import {
  SpeakerLabels,
  type Speaker as SpeakerLabelType,
} from "./components/speaker-labels";
import { ExportMenu } from "./components/export-menu";

type RecordingStatus = "recording" | "processing" | "ready" | "error";
type RecordingSource = "web" | "mobile" | "twilio";

interface Recording {
  id: string;
  title: string;
  created_at: string;
  duration_ms: number;
  status: RecordingStatus;
  source: RecordingSource;
  audio_url: string | null;
}

interface RecordingDetailClientProps {
  recording: Recording;
  speakers: SpeakerLabelType[];
  segments: TranscriptSegment[];
  summary: Summary | null;
  qaMessages: QAMessage[];
}

const statusConfig: Record<
  RecordingStatus,
  { label: string; className: string }
> = {
  recording: {
    label: "Recording",
    className: "bg-red-100 text-red-700 border-red-200",
  },
  processing: {
    label: "Processing",
    className: "bg-yellow-100 text-yellow-700 border-yellow-200",
  },
  ready: {
    label: "Ready",
    className: "bg-green-100 text-green-700 border-green-200",
  },
  error: {
    label: "Error",
    className: "bg-red-100 text-red-700 border-red-200",
  },
};

const sourceIcons: Record<RecordingSource, React.ElementType> = {
  web: Globe,
  mobile: Smartphone,
  twilio: Phone,
};

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatDuration(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const hrs = Math.floor(totalSeconds / 3600);
  const mins = Math.floor((totalSeconds % 3600) / 60);
  const secs = totalSeconds % 60;
  if (hrs > 0) {
    return `${hrs}h ${mins}m`;
  }
  return `${mins}m ${secs}s`;
}

export function RecordingDetailClient({
  recording,
  speakers,
  segments,
  summary,
  qaMessages,
}: RecordingDetailClientProps) {
  const [currentTimeMs, setCurrentTimeMs] = useState(0);
  const [title, setTitle] = useState(recording.title);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editTitleValue, setEditTitleValue] = useState(recording.title);

  const statusInfo = statusConfig[recording.status];
  const SourceIcon = sourceIcons[recording.source];
  const durationSeconds = recording.duration_ms / 1000;

  const saveTitle = async () => {
    const trimmed = editTitleValue.trim();
    if (!trimmed) {
      setEditTitleValue(title);
      setIsEditingTitle(false);
      return;
    }

    setTitle(trimmed);
    setIsEditingTitle(false);

    try {
      await fetch(`/api/recordings/${recording.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: trimmed }),
      });
    } catch {
      setTitle(recording.title);
    }
  };

  const handleTitleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      saveTitle();
    }
    if (e.key === "Escape") {
      setEditTitleValue(title);
      setIsEditingTitle(false);
    }
  };

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Sticky header with audio player */}
      <div className="shrink-0 border-b bg-white dark:bg-card dark:border-border">
        {/* Top bar */}
        <div className="px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon-sm"
              render={<Link href="/" />}
            >
              <ArrowLeft className="h-4 w-4" />
              <span className="sr-only">Back</span>
            </Button>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                {isEditingTitle ? (
                  <div className="flex items-center gap-1.5">
                    <input
                      autoFocus
                      type="text"
                      value={editTitleValue}
                      onChange={(e) => setEditTitleValue(e.target.value)}
                      onKeyDown={handleTitleKeyDown}
                      onBlur={saveTitle}
                      className="h-7 w-64 rounded-md border border-blue-300 bg-white dark:bg-background dark:border-blue-500/50 px-2 text-sm font-semibold text-gray-900 dark:text-gray-100 outline-none ring-2 ring-blue-100 dark:ring-blue-500/20"
                    />
                    <button
                      onMouseDown={(e) => {
                        e.preventDefault();
                        saveTitle();
                      }}
                      className="text-green-600 hover:text-green-700"
                    >
                      <Check className="h-4 w-4" />
                    </button>
                    <button
                      onMouseDown={(e) => {
                        e.preventDefault();
                        setEditTitleValue(title);
                        setIsEditingTitle(false);
                      }}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => {
                      setEditTitleValue(title);
                      setIsEditingTitle(true);
                    }}
                    className="group flex items-center gap-1.5 text-left"
                  >
                    <h1 className="truncate text-sm font-semibold text-gray-900 dark:text-gray-100 sm:text-base">
                      {title}
                    </h1>
                    <Pencil className="h-3 w-3 shrink-0 text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </button>
                )}

                <Badge
                  variant="outline"
                  className={cn(
                    "shrink-0 text-[10px]",
                    statusInfo.className
                  )}
                >
                  {statusInfo.label}
                </Badge>

                {recording.status === "ready" && (
                  <ExportMenu recordingId={recording.id} />
                )}
              </div>

              {/* Meta row */}
              <div className="mt-1 flex items-center gap-3 text-xs text-gray-400">
                <SourceIcon className="h-3.5 w-3.5" />
                <span>{formatDate(recording.created_at)}</span>
                <span>{formatDuration(recording.duration_ms)}</span>
              </div>
            </div>
          </div>

          {/* Speaker labels */}
          {speakers.length > 0 && (
            <div className="mt-3">
              <SpeakerLabels
                speakers={speakers}
                recordingId={recording.id}
              />
            </div>
          )}
        </div>

        {/* Audio player */}
        {recording.audio_url && (
          <div className="px-4 pb-3 sm:px-6">
            <AudioPlayer
              audioUrl={recording.audio_url}
              duration={durationSeconds}
              onTimeUpdate={setCurrentTimeMs}
            />
          </div>
        )}
      </div>

      {/* Content area — desktop: two columns, mobile: tabs */}

      {/* Mobile layout */}
      <div className="flex-1 overflow-hidden lg:hidden">
        <Tabs defaultValue="transcript" className="flex h-full flex-col">
          <div className="shrink-0 border-b bg-white dark:bg-card dark:border-border px-4 py-2">
            <TabsList variant="default">
              <TabsTrigger value="transcript">Transcript</TabsTrigger>
              <TabsTrigger value="summary">Summary</TabsTrigger>
              <TabsTrigger value="qa">Q&A</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="transcript" className="flex-1 overflow-hidden p-4">
            <TranscriptViewer
              segments={segments}
              speakers={speakers}
              currentTimeMs={currentTimeMs}
            />
          </TabsContent>

          <TabsContent value="summary" className="flex-1 overflow-hidden p-4">
            <SummaryPanel
              summary={summary}
              isLoading={recording.status === "processing"}
              recordingId={recording.id}
            />
          </TabsContent>

          <TabsContent value="qa" className="flex-1 overflow-hidden p-4">
            <QAChat
              recordingId={recording.id}
              initialMessages={qaMessages}
            />
          </TabsContent>
        </Tabs>
      </div>

      {/* Desktop layout */}
      <div className="hidden flex-1 overflow-hidden lg:flex">
        {/* Left: Transcript (60%) */}
        <div className="flex w-[60%] flex-col border-r p-4">
          <h2 className="mb-3 shrink-0 text-sm font-semibold text-gray-900 dark:text-gray-100">
            Transcript
          </h2>
          <div className="flex-1 overflow-hidden">
            <TranscriptViewer
              segments={segments}
              speakers={speakers}
              currentTimeMs={currentTimeMs}
            />
          </div>
        </div>

        {/* Right: Summary / Q&A tabs (40%) */}
        <div className="flex w-[40%] flex-col overflow-hidden">
          <Tabs defaultValue="summary" className="flex h-full flex-col">
            <div className="shrink-0 border-b px-4 py-2">
              <TabsList variant="default">
                <TabsTrigger value="summary">Summary</TabsTrigger>
                <TabsTrigger value="qa">Q&A</TabsTrigger>
              </TabsList>
            </div>

            <TabsContent
              value="summary"
              className="flex-1 overflow-hidden p-4"
            >
              <SummaryPanel
                summary={summary}
                isLoading={recording.status === "processing"}
                recordingId={recording.id}
              />
            </TabsContent>

            <TabsContent value="qa" className="flex-1 overflow-hidden p-4">
              <QAChat
                recordingId={recording.id}
                initialMessages={qaMessages}
              />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
