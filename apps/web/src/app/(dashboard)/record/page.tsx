"use client";

import { useCallback, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Mic, Square, Pause, Play, X, ArrowLeft, Upload, Wifi } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAudioRecorder } from "@/hooks/use-audio-recorder";
import { useChunkUpload } from "@/hooks/use-chunk-upload";
import { useRealtimeTranscript } from "@/hooks/use-realtime-transcript";

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export default function RecordPage() {
  const router = useRouter();
  const [recordingId, setRecordingId] = useState<string | null>(null);
  const [liveTranscribe, setLiveTranscribe] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [isFinalizing, setIsFinalizing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const recordingIdRef = useRef<string | null>(null);

  const { addChunk, uploadedCount, pendingCount, isUploading, error: uploadError } =
    useChunkUpload(recordingId);

  const onChunk = useCallback(
    (blob: Blob, index: number) => {
      addChunk(blob, index);
    },
    [addChunk]
  );

  const { startRecording, stopRecording, pauseRecording, resumeRecording, isRecording, isPaused, duration } =
    useAudioRecorder(onChunk);

  const { segments, isConnected } = useRealtimeTranscript(
    liveTranscribe ? recordingId : null
  );

  const totalChunks = uploadedCount + pendingCount;

  const handleStart = async () => {
    setError(null);
    setIsCreating(true);

    try {
      // Create a new recording on the server
      const response = await fetch("/api/recordings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "Untitled Recording", source: "microphone" }),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error || "Failed to create recording");
      }

      const { recording } = await response.json();
      setRecordingId(recording.id);
      recordingIdRef.current = recording.id;

      // Start the MediaRecorder
      await startRecording();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to start recording";
      setError(message);
    } finally {
      setIsCreating(false);
    }
  };

  const handleStop = async () => {
    stopRecording();
    setIsFinalizing(true);
    setError(null);

    try {
      const id = recordingIdRef.current;
      if (!id) throw new Error("No recording ID");

      // Wait a moment for final chunk to upload
      await new Promise((resolve) => setTimeout(resolve, 1500));

      const response = await fetch(`/api/recordings/${id}/finalize`, {
        method: "POST",
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error || "Failed to finalize recording");
      }

      // Navigate to the recording detail page
      router.push(`/recordings/${id}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to finalize";
      setError(message);
      setIsFinalizing(false);
    }
  };

  const handleCancel = () => {
    stopRecording();
    setRecordingId(null);
    recordingIdRef.current = null;
    setError(null);
  };

  const displayError = error || uploadError;

  return (
    <div className="flex h-full flex-col">
      {/* Top nav */}
      <div className="flex items-center gap-3 border-b bg-white px-4 py-3">
        <Button variant="ghost" size="icon-sm" render={<Link href="/dashboard" />}>
          <ArrowLeft className="h-4 w-4" />
          <span className="sr-only">Back</span>
        </Button>
        <h1 className="text-sm font-semibold text-gray-900">New Recording</h1>

        {/* Upload status indicator */}
        {isRecording && (
          <div className="ml-auto flex items-center gap-2 text-xs text-gray-500">
            {isUploading && <Upload className="h-3 w-3 animate-pulse text-blue-500" />}
            <span>
              {uploadedCount}/{totalChunks} chunks
            </span>
            {liveTranscribe && isConnected && (
              <Wifi className="h-3 w-3 text-green-500" />
            )}
          </div>
        )}
      </div>

      {/* Center content */}
      <div className="flex flex-1 flex-col items-center justify-center gap-8 px-4">
        {/* Error message */}
        {displayError && (
          <div className="w-full max-w-md rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {displayError}
          </div>
        )}

        {/* Mic button */}
        <button
          onClick={() => {
            if (!isRecording && !isCreating && !isFinalizing) {
              handleStart();
            }
          }}
          disabled={isRecording || isCreating || isFinalizing}
          className={cn(
            "relative flex h-[120px] w-[120px] items-center justify-center rounded-full transition-all",
            isRecording
              ? "bg-red-500 shadow-[0_0_0_12px_rgba(239,68,68,0.15)]"
              : isCreating
                ? "bg-gray-400 shadow-[0_0_0_12px_rgba(156,163,175,0.15)]"
                : "bg-blue-500 shadow-[0_0_0_12px_rgba(59,130,246,0.15)] hover:shadow-[0_0_0_16px_rgba(59,130,246,0.2)]"
          )}
        >
          <Mic className="h-10 w-10 text-white" />
          {isRecording && !isPaused && (
            <span className="absolute inset-0 animate-ping rounded-full bg-red-400 opacity-20" />
          )}
        </button>

        {/* Status text */}
        <p className="text-sm font-medium text-gray-500">
          {isFinalizing
            ? "Processing recording..."
            : isCreating
              ? "Setting up..."
              : !isRecording
                ? "Tap to start recording"
                : isPaused
                  ? "Recording paused"
                  : "Recording in progress..."}
        </p>

        {/* Timer */}
        <div className="font-mono text-4xl font-light tracking-widest text-gray-900">
          {formatDuration(duration)}
        </div>

        {/* Controls */}
        <div className="flex items-center gap-6">
          <button
            onClick={handleCancel}
            className={cn(
              "flex h-12 w-12 items-center justify-center rounded-full transition-colors",
              isRecording
                ? "bg-gray-100 text-gray-600 hover:bg-gray-200"
                : "bg-gray-50 text-gray-300 cursor-not-allowed"
            )}
            disabled={!isRecording}
          >
            <X className="h-5 w-5" />
          </button>

          <button
            onClick={handleStop}
            className={cn(
              "flex h-14 w-14 items-center justify-center rounded-full transition-colors",
              isRecording
                ? "bg-red-100 text-red-600 hover:bg-red-200"
                : "bg-gray-50 text-gray-300 cursor-not-allowed"
            )}
            disabled={!isRecording || isFinalizing}
          >
            <Square className="h-5 w-5" />
          </button>

          <button
            onClick={() => {
              if (isRecording) {
                if (isPaused) {
                  resumeRecording();
                } else {
                  pauseRecording();
                }
              }
            }}
            className={cn(
              "flex h-12 w-12 items-center justify-center rounded-full transition-colors",
              isRecording
                ? "bg-gray-100 text-gray-600 hover:bg-gray-200"
                : "bg-gray-50 text-gray-300 cursor-not-allowed"
            )}
            disabled={!isRecording}
          >
            {isPaused ? (
              <Play className="h-5 w-5" />
            ) : (
              <Pause className="h-5 w-5" />
            )}
          </button>
        </div>

        {/* Live transcribe toggle */}
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-600">Live Transcribe</span>
          <button
            role="switch"
            aria-checked={liveTranscribe}
            onClick={() => setLiveTranscribe((v) => !v)}
            className={cn(
              "relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors",
              liveTranscribe ? "bg-blue-500" : "bg-gray-200"
            )}
          >
            <span
              className={cn(
                "pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform",
                liveTranscribe ? "translate-x-5" : "translate-x-0.5"
              )}
            />
          </button>
        </div>

        {/* Live transcript display */}
        {liveTranscribe && segments.length > 0 && (
          <div className="w-full max-w-lg">
            <div className="rounded-lg border bg-gray-50 p-4">
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-400">
                Live Transcript
              </h3>
              <div className="max-h-48 space-y-1 overflow-y-auto text-sm text-gray-700">
                {segments.map((seg) => (
                  <p key={seg.id}>
                    {seg.speaker_label && (
                      <span className="font-medium text-blue-600">
                        {seg.speaker_label}:{" "}
                      </span>
                    )}
                    {seg.text}
                  </p>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
