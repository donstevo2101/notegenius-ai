"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Play, Pause, Volume2, VolumeX } from "lucide-react";
import { cn } from "@/lib/utils";

interface AudioPlayerProps {
  audioUrl: string;
  duration: number; // total duration in seconds
  onTimeUpdate?: (currentTimeMs: number) => void;
}

function formatTime(seconds: number): string {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  if (hrs > 0) {
    return `${hrs.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  }
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
}

export function AudioPlayer({ audioUrl, duration, onTimeUpdate }: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  const handleTimeUpdate = useCallback(() => {
    if (!audioRef.current) return;
    const time = audioRef.current.currentTime;
    setCurrentTime(time);
    onTimeUpdate?.(time * 1000);
  }, [onTimeUpdate]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onLoaded = () => setIsLoaded(true);
    const onEnded = () => setIsPlaying(false);

    audio.addEventListener("loadedmetadata", onLoaded);
    audio.addEventListener("timeupdate", handleTimeUpdate);
    audio.addEventListener("ended", onEnded);

    return () => {
      audio.removeEventListener("loadedmetadata", onLoaded);
      audio.removeEventListener("timeupdate", handleTimeUpdate);
      audio.removeEventListener("ended", onEnded);
    };
  }, [handleTimeUpdate]);

  const togglePlayPause = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!audioRef.current) return;
    const newTime = parseFloat(e.target.value);
    audioRef.current.currentTime = newTime;
    setCurrentTime(newTime);
    onTimeUpdate?.(newTime * 1000);
  };

  const toggleMute = () => {
    if (!audioRef.current) return;
    audioRef.current.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  // Allow external seeking via a custom event
  useEffect(() => {
    const handleSeekEvent = (e: CustomEvent<number>) => {
      if (!audioRef.current) return;
      const timeSeconds = e.detail;
      audioRef.current.currentTime = timeSeconds;
      setCurrentTime(timeSeconds);
      onTimeUpdate?.(timeSeconds * 1000);
    };

    window.addEventListener("audio-seek" as string, handleSeekEvent as EventListener);
    return () => {
      window.removeEventListener("audio-seek" as string, handleSeekEvent as EventListener);
    };
  }, [onTimeUpdate]);

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="flex items-center gap-3 rounded-lg border bg-white px-4 py-3 shadow-sm">
      <audio ref={audioRef} src={audioUrl} preload="metadata" />

      {/* Play/Pause */}
      <button
        onClick={togglePlayPause}
        className={cn(
          "flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-colors",
          "bg-blue-500 text-white hover:bg-blue-600"
        )}
      >
        {isPlaying ? (
          <Pause className="h-4 w-4" />
        ) : (
          <Play className="h-4 w-4 ml-0.5" />
        )}
      </button>

      {/* Current time */}
      <span className="w-14 shrink-0 text-xs font-mono text-gray-600 text-right">
        {formatTime(currentTime)}
      </span>

      {/* Seek bar */}
      <div className="relative flex-1 h-8 flex items-center">
        <div className="absolute inset-x-0 h-1.5 rounded-full bg-gray-200">
          <div
            className="h-full rounded-full bg-blue-500 transition-[width] duration-100"
            style={{ width: `${progress}%` }}
          />
        </div>
        <input
          type="range"
          min={0}
          max={duration}
          step={0.1}
          value={currentTime}
          onChange={handleSeek}
          className="absolute inset-x-0 w-full h-1.5 cursor-pointer opacity-0"
        />
      </div>

      {/* Total time */}
      <span className="w-14 shrink-0 text-xs font-mono text-gray-400">
        {formatTime(duration)}
      </span>

      {/* Mute */}
      <button
        onClick={toggleMute}
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-gray-400 hover:text-gray-600 transition-colors"
      >
        {isMuted ? (
          <VolumeX className="h-4 w-4" />
        ) : (
          <Volume2 className="h-4 w-4" />
        )}
      </button>
    </div>
  );
}

/** Utility to seek the audio player from outside the component */
export function seekAudio(timeSeconds: number) {
  window.dispatchEvent(
    new CustomEvent("audio-seek", { detail: timeSeconds })
  );
}
