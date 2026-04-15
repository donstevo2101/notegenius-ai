"use client";

import { useState } from "react";
import Link from "next/link";
import { Search, Mic, FileText } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { RecordingCard } from "@/components/recording-card";

const mockRecordings = [
  {
    id: "rec-001",
    title: "Q3 Marketing Strategy",
    date: "Apr 14, 2026",
    duration: "42:15",
    status: "ready" as const,
    summarySnippet:
      "Discussed the Q3 marketing roadmap including social media campaigns, influencer partnerships, and the planned product launch event in September.",
    source: "web" as const,
  },
  {
    id: "rec-002",
    title: "Product Design Review",
    date: "Apr 12, 2026",
    duration: "28:30",
    status: "ready" as const,
    summarySnippet:
      "Reviewed the latest wireframes for the mobile app redesign. Team agreed on the new navigation pattern and color scheme updates for v2.0.",
    source: "web" as const,
  },
  {
    id: "rec-003",
    title: "Client Onboarding — Acme Corp",
    date: "Apr 11, 2026",
    duration: "35:50",
    status: "processing" as const,
    summarySnippet:
      "Walked through the onboarding checklist with the Acme Corp team. Covered platform setup, data migration timeline, and training schedule.",
    source: "twilio" as const,
  },
  {
    id: "rec-004",
    title: "Weekly Engineering Standup",
    date: "Apr 10, 2026",
    duration: "15:22",
    status: "ready" as const,
    summarySnippet:
      "Sprint progress update: authentication module complete, API rate limiting in review. Blockers on third-party payment integration discussed.",
    source: "mobile" as const,
  },
  {
    id: "rec-005",
    title: "Investor Pitch Rehearsal",
    date: "Apr 9, 2026",
    duration: "52:10",
    status: "ready" as const,
    summarySnippet:
      "Full run-through of the Series A pitch deck. Feedback on traction slides and competitive positioning. Final version due by Friday.",
    source: "web" as const,
  },
];

type FilterTab = "all" | "meetings" | "favorites" | "imported";

export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState<FilterTab>("all");
  const [searchQuery, setSearchQuery] = useState("");

  const filtered = mockRecordings.filter((rec) =>
    rec.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">My Summaries</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {filtered.length} recording{filtered.length !== 1 ? "s" : ""}
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
          <RecordingGrid recordings={filtered} />
        </TabsContent>
        <TabsContent value="meetings">
          <RecordingGrid recordings={filtered} />
        </TabsContent>
        <TabsContent value="favorites">
          <RecordingGrid recordings={filtered} />
        </TabsContent>
        <TabsContent value="imported">
          <RecordingGrid recordings={filtered} />
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

function RecordingGrid({
  recordings,
}: {
  recordings: typeof mockRecordings;
}) {
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
