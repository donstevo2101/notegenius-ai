"use client";

import { useState } from "react";
import { Check, Pencil } from "lucide-react";
import { cn } from "@/lib/utils";

export interface Speaker {
  index: number;
  label: string;
}

interface SpeakerLabelsProps {
  speakers: Speaker[];
  recordingId: string;
}

const DOT_COLORS = [
  "bg-blue-500",
  "bg-green-500",
  "bg-purple-500",
  "bg-orange-500",
  "bg-pink-500",
  "bg-teal-500",
  "bg-indigo-500",
  "bg-amber-500",
];

export function SpeakerLabels({ speakers: initialSpeakers, recordingId }: SpeakerLabelsProps) {
  const [speakers, setSpeakers] = useState<Speaker[]>(initialSpeakers);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editValue, setEditValue] = useState("");

  const startEditing = (speaker: Speaker) => {
    setEditingIndex(speaker.index);
    setEditValue(speaker.label);
  };

  const saveLabel = async (speakerIndex: number) => {
    const trimmed = editValue.trim();
    if (!trimmed) {
      setEditingIndex(null);
      return;
    }

    const updated = speakers.map((s) =>
      s.index === speakerIndex ? { ...s, label: trimmed } : s
    );
    setSpeakers(updated);
    setEditingIndex(null);

    try {
      await fetch(`/api/recordings/${recordingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          speakers: updated.map((s) => ({
            index: s.index,
            label: s.label,
          })),
        }),
      });
    } catch {
      // Revert on error
      setSpeakers(initialSpeakers);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent, speakerIndex: number) => {
    if (e.key === "Enter") {
      e.preventDefault();
      saveLabel(speakerIndex);
    }
    if (e.key === "Escape") {
      setEditingIndex(null);
    }
  };

  if (speakers.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-xs font-medium text-gray-400">Speakers:</span>
      {speakers.map((speaker) => {
        const dotColor = DOT_COLORS[speaker.index % DOT_COLORS.length];
        const isEditing = editingIndex === speaker.index;

        return (
          <div
            key={speaker.index}
            className="flex items-center gap-1.5 rounded-full border bg-white px-2.5 py-1"
          >
            <div className={cn("h-2 w-2 shrink-0 rounded-full", dotColor)} />

            {isEditing ? (
              <div className="flex items-center gap-1">
                <input
                  autoFocus
                  type="text"
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  onKeyDown={(e) => handleKeyDown(e, speaker.index)}
                  onBlur={() => saveLabel(speaker.index)}
                  className="h-5 w-24 border-none bg-transparent text-xs text-gray-700 outline-none focus:ring-0"
                />
                <button
                  onMouseDown={(e) => {
                    e.preventDefault();
                    saveLabel(speaker.index);
                  }}
                  className="text-blue-500 hover:text-blue-700"
                >
                  <Check className="h-3 w-3" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => startEditing(speaker)}
                className="group flex items-center gap-1 text-xs text-gray-700 hover:text-blue-600 transition-colors"
              >
                <span>{speaker.label}</span>
                <Pencil className="h-2.5 w-2.5 opacity-0 group-hover:opacity-100 transition-opacity" />
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}
