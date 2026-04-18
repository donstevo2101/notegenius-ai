"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Play, Pause, Volume2, VolumeX } from "lucide-react";
import { cn } from "@/lib/utils";

interface AudioPlayerProps {
  audioUrl: string;
  chunkUrls?: string[];
  duration: number;
  onTimeUpdate?: (currentTimeMs: number) => void;
}

function formatTime(seconds: number): string {
  if (!seconds || seconds < 0) return "00:00";
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  if (hrs > 0) {
    return `${hrs.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  }
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
}

const CHUNK_DURATION = 30;

export function AudioPlayer({
  audioUrl,
  chunkUrls = [],
  duration,
  onTimeUpdate,
}: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [isMuted, setIsMuted] = useState(false);

  // Use refs for chunk tracking to avoid stale closures
  const currentChunkRef = useRef(0);
  const chunkOffsetRef = useRef(0);
  const isPlayingRef = useRef(false);
  const onTimeUpdateRef = useRef(onTimeUpdate);

  useEffect(() => {
    onTimeUpdateRef.current = onTimeUpdate;
  }, [onTimeUpdate]);

  const hasChunks = chunkUrls.length > 1;
  const urls = hasChunks ? chunkUrls : [audioUrl];
  const urlsRef = useRef(urls);
  useEffect(() => {
    urlsRef.current = urls;
  }, [urls]);

  const effectiveDuration = duration || urls.length * CHUNK_DURATION;

  // Create audio element once
  useEffect(() => {
    const audio = new Audio();
    audio.preload = "metadata";
    audioRef.current = audio;

    // Time update handler
    audio.addEventListener("timeupdate", () => {
      const globalTime = chunkOffsetRef.current + audio.currentTime;
      setCurrentTime(globalTime);
      onTimeUpdateRef.current?.(globalTime * 1000);
    });

    // Ended handler — advance to next chunk
    audio.addEventListener("ended", () => {
      const currentUrls = urlsRef.current;
      const currentIdx = currentChunkRef.current;

      if (currentIdx < currentUrls.length - 1) {
        const nextIdx = currentIdx + 1;
        currentChunkRef.current = nextIdx;
        chunkOffsetRef.current = nextIdx * CHUNK_DURATION;
        audio.src = currentUrls[nextIdx];
        audio.load();
        audio.play().catch(() => {});
      } else {
        setIsPlaying(false);
        isPlayingRef.current = false;
      }
    });

    // Load first chunk
    if (urls.length > 0) {
      audio.src = urls[0];
      audio.load();
    }

    return () => {
      audio.pause();
      audio.src = "";
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const togglePlayPause = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlayingRef.current) {
      audio.pause();
      setIsPlaying(false);
      isPlayingRef.current = false;
    } else {
      audio.play().catch(() => {});
      setIsPlaying(true);
      isPlayingRef.current = true;
    }
  };

  const handleSeek = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const audio = audioRef.current;
    if (!audio) return;

    const newGlobalTime = parseFloat(e.target.value);
    const currentUrls = urlsRef.current;

    if (currentUrls.length > 1) {
      const targetChunk = Math.min(
        Math.floor(newGlobalTime / CHUNK_DURATION),
        currentUrls.length - 1
      );
      const timeWithinChunk = newGlobalTime - targetChunk * CHUNK_DURATION;

      if (targetChunk !== currentChunkRef.current) {
        currentChunkRef.current = targetChunk;
        chunkOffsetRef.current = targetChunk * CHUNK_DURATION;
        audio.src = currentUrls[targetChunk];
        audio.load();
        audio.addEventListener("canplay", function handler() {
          audio.currentTime = timeWithinChunk;
          if (isPlayingRef.current) audio.play().catch(() => {});
          audio.removeEventListener("canplay", handler);
        });
      } else {
        audio.currentTime = timeWithinChunk;
      }
    } else {
      audio.currentTime = newGlobalTime;
    }

    setCurrentTime(newGlobalTime);
    onTimeUpdateRef.current?.(newGlobalTime * 1000);
  }, []);

  const toggleMute = () => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  // External seek via custom event
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<number>).detail;
      const fakeEvent = { target: { value: String(detail) } } as unknown as React.ChangeEvent<HTMLInputElement>;
      handleSeek(fakeEvent);
    };
    window.addEventListener("audio-seek", handler);
    return () => window.removeEventListener("audio-seek", handler);
  }, [handleSeek]);

  const progress = effectiveDuration > 0 ? (currentTime / effectiveDuration) * 100 : 0;

  return (
    <div className="flex items-center gap-3 rounded-lg border bg-white px-4 py-3 shadow-sm dark:bg-gray-800 dark:border-gray-700">
      <button
        onClick={togglePlayPause}
        className={cn(
          "flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-colors cursor-pointer",
          "bg-blue-500 text-white hover:bg-blue-600"
        )}
      >
        {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 ml-0.5" />}
      </button>

      <span className="w-14 shrink-0 text-xs font-mono text-gray-600 text-right dark:text-gray-300">
        {formatTime(currentTime)}
      </span>

      <div className="relative flex-1 h-8 flex items-center">
        <div className="absolute inset-x-0 h-1.5 rounded-full bg-gray-200 dark:bg-gray-600">
          <div
            className="h-full rounded-full bg-blue-500 transition-[width] duration-100"
            style={{ width: `${Math.min(progress, 100)}%` }}
          />
        </div>
        <input
          type="range"
          min={0}
          max={effectiveDuration}
          step={0.1}
          value={currentTime}
          onChange={handleSeek}
          className="absolute inset-x-0 w-full h-1.5 cursor-pointer opacity-0"
        />
      </div>

      <span className="w-14 shrink-0 text-xs font-mono text-gray-400">
        {formatTime(effectiveDuration)}
      </span>

      <button
        onClick={toggleMute}
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
      >
        {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
      </button>
    </div>
  );
}

export function seekAudio(timeSeconds: number) {
  window.dispatchEvent(new CustomEvent("audio-seek", { detail: timeSeconds }));
}
