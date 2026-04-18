"use client";

import { useState } from "react";
import {
  CheckSquare,
  Square,
  RefreshCw,
  Lightbulb,
  ListChecks,
  MessageSquare,
  Tag,
  Smile,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { seekAudio } from "./audio-player";

export interface ActionItem {
  id?: string;
  text: string;
  completed?: boolean;
  done?: boolean;
  assignee?: string;
}

export interface KeyDecision {
  id?: string;
  text: string;
  context?: string;
  timestamp_ms?: number;
}

export interface Topic {
  id?: string;
  name: string;
  start_ms?: number;
  end_ms?: number;
  summary?: string;
}

export interface Summary {
  id: string;
  overview: string;
  action_items: ActionItem[];
  key_decisions: KeyDecision[];
  topics: Topic[];
  sentiment: "positive" | "negative" | "neutral" | "mixed";
}

interface SummaryPanelProps {
  summary: Summary | null;
  isLoading: boolean;
  recordingId: string;
}

const sentimentConfig: Record<
  string,
  { label: string; className: string }
> = {
  positive: {
    label: "Positive",
    className: "bg-green-100 text-green-700 border-green-200",
  },
  negative: {
    label: "Negative",
    className: "bg-red-100 text-red-700 border-red-200",
  },
  neutral: {
    label: "Neutral",
    className: "bg-gray-100 text-gray-600 border-gray-200",
  },
  mixed: {
    label: "Mixed",
    className: "bg-yellow-100 text-yellow-700 border-yellow-200",
  },
};

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

export function SummaryPanel({ summary, isLoading, recordingId }: SummaryPanelProps) {
  const [actionItems, setActionItems] = useState<ActionItem[]>(
    (summary?.action_items ?? []).map((item, idx) => ({
      ...item,
      id: item.id ?? `action-${idx}`,
      completed: item.completed ?? item.done ?? false,
    }))
  );
  const [isRegenerating, setIsRegenerating] = useState(false);

  const toggleActionItem = async (itemId: string | undefined, index: number) => {
    const updated = actionItems.map((item, idx) =>
      (itemId ? item.id === itemId : idx === index) ? { ...item, completed: !item.completed } : item
    );
    setActionItems(updated);

    // Optimistic update — fire and forget the PATCH
    try {
      await fetch(`/api/recordings/${recordingId}/summary`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action_items: updated,
        }),
      });
    } catch {
      // Revert on error
      setActionItems(actionItems);
    }
  };

  const handleRegenerate = async () => {
    setIsRegenerating(true);
    try {
      await fetch(`/api/recordings/${recordingId}/summary`, {
        method: "POST",
      });
      // In a real app, this would trigger a re-fetch or SSE update
    } catch {
      // silently fail
    } finally {
      setIsRegenerating(false);
    }
  };

  // Loading skeleton
  if (isLoading || (!summary && isLoading)) {
    return (
      <div className="space-y-4 p-1">
        <div className="space-y-2">
          <div className="h-4 w-24 animate-pulse rounded bg-gray-200" />
          <div className="h-3 w-full animate-pulse rounded bg-gray-100" />
          <div className="h-3 w-4/5 animate-pulse rounded bg-gray-100" />
          <div className="h-3 w-3/5 animate-pulse rounded bg-gray-100" />
        </div>
        <Separator />
        <div className="space-y-2">
          <div className="h-4 w-28 animate-pulse rounded bg-gray-200" />
          <div className="h-3 w-full animate-pulse rounded bg-gray-100" />
          <div className="h-3 w-4/5 animate-pulse rounded bg-gray-100" />
        </div>
        <Separator />
        <div className="space-y-2">
          <div className="h-4 w-32 animate-pulse rounded bg-gray-200" />
          <div className="h-3 w-full animate-pulse rounded bg-gray-100" />
          <div className="h-3 w-3/4 animate-pulse rounded bg-gray-100" />
        </div>
      </div>
    );
  }

  if (!summary) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-gray-100">
          <Lightbulb className="h-5 w-5 text-gray-400" />
        </div>
        <p className="text-sm font-medium text-gray-700">No summary available</p>
        <p className="mt-1 text-xs text-gray-400">
          The summary will appear once processing is complete.
        </p>
      </div>
    );
  }

  const sentiment = sentimentConfig[summary.sentiment] ?? sentimentConfig.neutral;

  return (
    <ScrollArea className="h-full">
      <div className="space-y-5 p-1 pb-4">
        {/* Sentiment badge */}
        <div className="flex items-center gap-2">
          <Smile className="h-4 w-4 text-gray-400" />
          <span className="text-xs font-medium text-gray-500">Sentiment</span>
          <Badge
            variant="outline"
            className={cn("text-[10px]", sentiment.className)}
          >
            {sentiment.label}
          </Badge>
        </div>

        <Separator />

        {/* Overview */}
        <section>
          <div className="mb-2 flex items-center gap-2">
            <MessageSquare className="h-4 w-4 text-gray-400" />
            <h3 className="text-sm font-semibold text-gray-900">Overview</h3>
          </div>
          <div className="space-y-2">
            {(summary.overview || "").split("\n\n").map((paragraph, i) => (
              <p key={i} className="text-sm leading-relaxed text-gray-600">
                {paragraph}
              </p>
            ))}
          </div>
        </section>

        <Separator />

        {/* Action Items */}
        {actionItems.length > 0 && (
          <>
            <section>
              <div className="mb-2 flex items-center gap-2">
                <ListChecks className="h-4 w-4 text-gray-400" />
                <h3 className="text-sm font-semibold text-gray-900">
                  Action Items
                </h3>
                <span className="text-[10px] text-gray-400">
                  {actionItems.filter((i) => i.completed).length}/{actionItems.length}
                </span>
              </div>
              <ul className="space-y-2">
                {actionItems.map((item, idx) => (
                  <li key={item.id ?? `action-${idx}`} className="flex items-start gap-2">
                    <button
                      onClick={() => toggleActionItem(item.id, idx)}
                      className="mt-0.5 shrink-0 text-gray-400 hover:text-blue-500 transition-colors"
                    >
                      {item.completed ? (
                        <CheckSquare className="h-4 w-4 text-blue-500" />
                      ) : (
                        <Square className="h-4 w-4" />
                      )}
                    </button>
                    <span
                      className={cn(
                        "text-sm leading-relaxed",
                        item.completed
                          ? "text-gray-400 line-through"
                          : "text-gray-700"
                      )}
                    >
                      {item.text}
                      {item.assignee && (
                        <span className="ml-1 text-xs text-gray-400">
                          ({item.assignee})
                        </span>
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
            <Separator />
          </>
        )}

        {/* Key Decisions */}
        {summary.key_decisions.length > 0 && (
          <>
            <section>
              <div className="mb-2 flex items-center gap-2">
                <Lightbulb className="h-4 w-4 text-gray-400" />
                <h3 className="text-sm font-semibold text-gray-900">
                  Key Decisions
                </h3>
              </div>
              <ul className="space-y-3">
                {summary.key_decisions.map((decision, idx) => (
                  <li key={decision.id ?? `decision-${idx}`} className="rounded-lg bg-gray-50 p-3">
                    <p className="text-sm font-medium text-gray-800">
                      {decision.text}
                    </p>
                    {decision.context && (
                      <p className="mt-1 text-xs text-gray-500">
                        {decision.context}
                      </p>
                    )}
                    {decision.timestamp_ms != null && (
                      <button
                        onClick={() => seekAudio(decision.timestamp_ms! / 1000)}
                        className="mt-1 font-mono text-[11px] text-blue-500 hover:text-blue-700 hover:underline"
                      >
                        {formatTimestamp(decision.timestamp_ms)}
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            </section>
            <Separator />
          </>
        )}

        {/* Topics */}
        {summary.topics.length > 0 && (
          <>
            <section>
              <div className="mb-2 flex items-center gap-2">
                <Tag className="h-4 w-4 text-gray-400" />
                <h3 className="text-sm font-semibold text-gray-900">Topics</h3>
              </div>
              <div className="flex flex-wrap gap-2">
                {summary.topics.map((topic, idx) => (
                  <button
                    key={topic.id ?? `topic-${idx}`}
                    onClick={() => topic.start_ms != null ? seekAudio(topic.start_ms / 1000) : undefined}
                    className="group flex items-center gap-1.5 rounded-full border bg-white px-3 py-1 text-xs transition-colors hover:border-blue-200 hover:bg-blue-50"
                  >
                    <span className="font-medium text-gray-700 group-hover:text-blue-600">
                      {topic.name}
                    </span>
                    {topic.start_ms != null && topic.end_ms != null && (
                      <span className="font-mono text-[10px] text-gray-400 group-hover:text-blue-500">
                        {formatTimestamp(topic.start_ms)} - {formatTimestamp(topic.end_ms)}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </section>
            <Separator />
          </>
        )}

        {/* Regenerate button */}
        <div className="pt-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRegenerate}
            disabled={isRegenerating}
            className="w-full gap-2"
          >
            <RefreshCw
              className={cn("h-3.5 w-3.5", isRegenerating && "animate-spin")}
            />
            {isRegenerating ? "Regenerating..." : "Regenerate Summary"}
          </Button>
        </div>
      </div>
    </ScrollArea>
  );
}
