"use client";

import Link from "next/link";
import { Globe, Smartphone, Phone, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type RecordingStatus = "recording" | "processing" | "ready" | "error";
type RecordingSource = "web" | "mobile" | "twilio";

interface RecordingCardProps {
  id: string;
  title: string;
  date: string;
  duration: string;
  status: RecordingStatus;
  summarySnippet: string;
  source: RecordingSource;
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

export function RecordingCard({
  id,
  title,
  date,
  duration,
  status,
  summarySnippet,
  source,
}: RecordingCardProps) {
  const statusInfo = statusConfig[status];
  const SourceIcon = sourceIcons[source];

  return (
    <Link href={`/recordings/${id}`} className="block">
      <div className="group rounded-xl border bg-white dark:bg-card dark:border-border p-4 shadow-sm transition-shadow hover:shadow-md">
        {/* Header row */}
        <div className="mb-2 flex items-start justify-between gap-2">
          <h3 className="truncate text-sm font-semibold text-gray-900 dark:text-gray-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
            {title}
          </h3>
          <Badge
            variant="outline"
            className={cn("shrink-0 text-[10px]", statusInfo.className)}
          >
            {statusInfo.label}
          </Badge>
        </div>

        {/* Summary snippet */}
        <p className="mb-3 line-clamp-2 text-xs leading-relaxed text-gray-500 dark:text-gray-400">
          {summarySnippet}
        </p>

        {/* Footer row */}
        <div className="flex items-center gap-3 text-[11px] text-gray-400">
          <SourceIcon className="h-3.5 w-3.5 shrink-0" />
          <span>{date}</span>
          <div className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            <span>{duration}</span>
          </div>
        </div>
      </div>
    </Link>
  );
}
