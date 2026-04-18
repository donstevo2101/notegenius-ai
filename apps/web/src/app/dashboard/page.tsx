"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Search, Mic, FileText, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { RecordingCard } from "@/components/recording-card";

interface Recording {
  id: string;
  title: string;
  status: string;
  source: string;
  duration_seconds: number | null;
  created_at: string;
  error_message?: string | null;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatDuration(seconds: number | null | undefined): string {
  if (!seconds) return "0:00";
  const totalSeconds = Math.floor(seconds);
  const hrs = Math.floor(totalSeconds / 3600);
  const mins = Math.floor((totalSeconds % 3600) / 60);
  const secs = totalSeconds % 60;
  if (hrs > 0) {
    return `${hrs}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  }
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

type FilterTab = "all" | "meetings" | "favorites" | "imported";

export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState<FilterTab>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchRecordings() {
      try {
        setIsLoading(true);
        const res = await fetch("/api/recordings");
        if (!res.ok) throw new Error("Failed to fetch recordings");
        const data = await res.json();
        setRecordings(data.recordings ?? []);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load recordings");
      } finally {
        setIsLoading(false);
      }
    }
    fetchRecordings();
  }, []);

  const filtered = recordings.filter((rec) =>
    (rec.title || "").toLowerCase().includes(searchQuery.toLowerCase())
  );

  const cardData = filtered.map((rec) => ({
    id: rec.id,
    title: rec.title || "Untitled Recording",
    date: formatDate(rec.created_at),
    duration: formatDuration(rec.duration_seconds),
    status: (["recording", "processing", "ready", "error"].includes(rec.status) ? rec.status : "processing") as "recording" | "processing" | "ready" | "error",
    summarySnippet: rec.error_message || "",
    source: (["web", "mobile", "twilio"].includes(rec.source) ? rec.source : "web") as "web" | "mobile" | "twilio",
  }));

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">My Summaries</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {isLoading ? "Loading..." : `${filtered.length} recording${filtered.length !== 1 ? "s" : ""}`}
          </p>
        </div>
      </div>

      {/* Filter tabs + search */}
      <Tabs
        defaultValue="all"
        onValueChange={(val) => setActiveTab(val as FilterTab)}
      >
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <TabsList variant="default">
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="meetings">Meetings</TabsTrigger>
            <TabsTrigger value="favorites">Favorites</TabsTrigger>
            <TabsTrigger value="imported">Imported</TabsTrigger>
          </TabsList>

          <div className="relative w-full sm:w-64">
            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search recordings..."
              className="pl-8 text-sm"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        <TabsContent value="all">
          <RecordingGrid recordings={cardData} isLoading={isLoading} error={error} />
        </TabsContent>
        <TabsContent value="meetings">
          <RecordingGrid recordings={cardData} isLoading={isLoading} error={error} />
        </TabsContent>
        <TabsContent value="favorites">
          <RecordingGrid recordings={cardData} isLoading={isLoading} error={error} />
        </TabsContent>
        <TabsContent value="imported">
          <RecordingGrid recordings={cardData} isLoading={isLoading} error={error} />
        </TabsContent>
      </Tabs>

      {/* Mobile FAB */}
      <Link
        href="/dashboard/record"
        className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-blue-500 text-white shadow-lg transition-transform hover:scale-105 active:scale-95 lg:hidden"
      >
        <Mic className="h-6 w-6" />
        <span className="sr-only">New recording</span>
      </Link>
    </div>
  );
}

interface CardData {
  id: string;
  title: string;
  date: string;
  duration: string;
  status: "recording" | "processing" | "ready" | "error";
  summarySnippet: string;
  source: "web" | "mobile" | "twilio";
}

function RecordingGrid({
  recordings,
  isLoading,
  error,
}: {
  recordings: CardData[];
  isLoading: boolean;
  error: string | null;
}) {
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed bg-white dark:bg-card dark:border-border py-16">
        <Loader2 className="mb-4 h-8 w-8 animate-spin text-gray-400" />
        <p className="text-sm text-muted-foreground">Loading recordings...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed bg-white dark:bg-card dark:border-border py-16">
        <p className="mb-1 text-sm font-medium text-destructive">
          {error}
        </p>
        <p className="text-sm text-muted-foreground">
          Please try refreshing the page.
        </p>
      </div>
    );
  }

  if (recordings.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed bg-white dark:bg-card dark:border-border py-16">
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-gray-100 dark:bg-muted">
          <FileText className="h-6 w-6 text-gray-400 dark:text-muted-foreground" />
        </div>
        <p className="mb-1 text-sm font-medium text-foreground">
          No recordings yet
        </p>
        <p className="text-sm text-muted-foreground">
          Hit the record button to get started!
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {recordings.map((rec) => (
        <RecordingCard key={rec.id} {...rec} />
      ))}
    </div>
  );
}
