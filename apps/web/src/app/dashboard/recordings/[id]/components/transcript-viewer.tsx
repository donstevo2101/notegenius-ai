"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { seekAudio } from "./audio-player";

export interface TranscriptSegment {
  id: string;
  start_ms: number;
  end_ms: number;
  speaker_index: number;
  text: string;
}

export interface Speaker {
  index: number;
  label: string;
}

interface TranscriptViewerProps {
  segments: TranscriptSegment[];
  speakers: Speaker[];
  currentTimeMs: number;
}

const SPEAKER_COLORS = [
  { bg: "bg-blue-100", text: "text-blue-700", dot: "bg-blue-500" },
  { bg: "bg-green-100", text: "text-green-700", dot: "bg-green-500" },
  { bg: "bg-purple-100", text: "text-purple-700", dot: "bg-purple-500" },
  { bg: "bg-orange-100", text: "text-orange-700", dot: "bg-orange-500" },
  { bg: "bg-pink-100", text: "text-pink-700", dot: "bg-pink-500" },
  { bg: "bg-teal-100", text: "text-teal-700", dot: "bg-teal-500" },
  { bg: "bg-indigo-100", text: "text-indigo-700", dot: "bg-indigo-500" },
  { bg: "bg-amber-100", text: "text-amber-700", dot: "bg-amber-500" },
];

function getSpeakerColor(index: number) {
  return SPEAKER_COLORS[index % SPEAKER_COLORS.length];
}

function formatTimestamp(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const hrs = Math.floor(totalSeconds / 3600);
  const mins = Math.floor((totalSeconds % 3600) / 60);
  const secs = totalSeconds % 60;
  if (hrs > 0) {
    return `${hrs.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  }
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
}

export function TranscriptViewer({
  segments,
  speakers,
  currentTimeMs,
}: TranscriptViewerProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const activeRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [autoScroll, setAutoScroll] = useState(true);

  // Find active segment index
  const activeIndex = useMemo(() => {
    for (let i = segments.length - 1; i >= 0; i--) {
      if (currentTimeMs >= segments[i].start_ms) {
        return i;
      }
    }
    return -1;
  }, [segments, currentTimeMs]);

  // Filter segments
  const filteredSegments = useMemo(() => {
    if (!searchQuery.trim()) return segments;
    const lower = searchQuery.toLowerCase();
    return segments.filter((seg) => seg.text.toLowerCase().includes(lower));
  }, [segments, searchQuery]);

  // Auto-scroll to active segment
  useEffect(() => {
    if (autoScroll && activeRef.current) {
      activeRef.current.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }
  }, [activeIndex, autoScroll]);

  // Disable auto-scroll on manual scroll, re-enable when active segment changes
  useEffect(() => {
    setAutoScroll(true);
  }, [activeIndex]);

  const getSpeakerLabel = (speakerIndex: number): string => {
    const speaker = speakers.find((s) => s.index === speakerIndex);
    return speaker?.label || `Speaker ${speakerIndex}`;
  };

  const handleTimestampClick = (startMs: number) => {
    seekAudio(startMs / 1000);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Search bar */}
      <div className="relative mb-3 shrink-0">
        <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search transcript..."
          className="pl-8 text-sm"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {/* Transcript segments */}
      <ScrollArea className="flex-1 overflow-auto">
        <div
          ref={scrollContainerRef}
          className="space-y-1 pr-2"
          onWheel={() => setAutoScroll(false)}
        >
          {filteredSegments.length === 0 ? (
            <div className="flex items-center justify-center py-12 text-sm text-gray-400">
              {searchQuery ? "No matching segments found" : "No transcript available"}
            </div>
          ) : (
            filteredSegments.map((segment, idx) => {
              const isActive =
                !searchQuery &&
                currentTimeMs >= segment.start_ms &&
                currentTimeMs < segment.end_ms;
              const color = getSpeakerColor(segment.speaker_index);

              return (
                <div
                  key={segment.id}
                  ref={isActive ? activeRef : undefined}
                  className={cn(
                    "group flex gap-3 rounded-lg px-3 py-2 transition-colors",
                    isActive
                      ? "bg-blue-50 border border-blue-100"
                      : "hover:bg-gray-50"
                  )}
                >
                  {/* Timestamp */}
                  <button
                    onClick={() => handleTimestampClick(segment.start_ms)}
                    className="shrink-0 pt-0.5 font-mono text-[11px] text-blue-500 hover:text-blue-700 hover:underline transition-colors"
                  >
                    {formatTimestamp(segment.start_ms)}
                  </button>

                  <div className="min-w-0 flex-1">
                    {/* Speaker badge */}
                    <Badge
                      variant="outline"
                      className={cn(
                        "mb-1 text-[10px] font-medium",
                        color.bg,
                        color.text,
                        "border-transparent"
                      )}
                    >
                      {getSpeakerLabel(segment.speaker_index)}
                    </Badge>

                    {/* Text */}
                    <p className="text-sm leading-relaxed text-gray-700">
                      {searchQuery ? (
                        <HighlightText text={segment.text} query={searchQuery} />
                      ) : (
                        segment.text
                      )}
                    </p>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

function HighlightText({ text, query }: { text: string; query: string }) {
  if (!query.trim()) return <>{text}</>;
  const parts = text.split(new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi"));
  return (
    <>
      {parts.map((part, i) =>
        part.toLowerCase() === query.toLowerCase() ? (
          <mark key={i} className="bg-yellow-200 rounded px-0.5">
            {part}
          </mark>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </>
  );
}
