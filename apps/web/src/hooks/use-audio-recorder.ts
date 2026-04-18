"use client";

import { useCallback, useEffect, useRef, useState } from "react";

interface UseAudioRecorderReturn {
  startRecording: () => Promise<void>;
  stopRecording: () => Promise<Blob | null>;
  pauseRecording: () => void;
  resumeRecording: () => void;
  isRecording: boolean;
  isPaused: boolean;
  duration: number;
}

export function useAudioRecorder(
  onChunk: (blob: Blob, index: number) => void
): UseAudioRecorderReturn {
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [duration, setDuration] = useState(0);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const onChunkRef = useRef(onChunk);

  useEffect(() => {
    onChunkRef.current = onChunk;
  }, [onChunk]);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      // Find a supported audio format — iOS Safari doesn't support webm
      const formats = [
        "audio/webm;codecs=opus",
        "audio/webm",
        "audio/mp4",
        "audio/aac",
        "audio/ogg;codecs=opus",
        "audio/wav",
      ];
      let mimeType = "";
      for (const fmt of formats) {
        try {
          if (MediaRecorder.isTypeSupported(fmt)) {
            mimeType = fmt;
            break;
          }
        } catch {
          // isTypeSupported may throw on some browsers
        }
      }

      // If no specific format supported, let browser choose default
      const recorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      chunksRef.current = [];

      // Collect all data chunks locally
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      recorder.onstart = () => {
        setIsRecording(true);
        setIsPaused(false);
        setDuration(0);

        timerRef.current = setInterval(() => {
          setDuration((prev) => prev + 1);
        }, 1000);
      };

      // Start without timeslice — iOS Safari has bugs with timeslice
      // ondataavailable fires once when stop() is called
      recorder.start();
    } catch (err) {
      console.error("Failed to start recording:", err);
      throw err;
    }
  }, [clearTimer]);

  const stopRecording = useCallback(async (): Promise<Blob | null> => {
    return new Promise((resolve) => {
      const recorder = mediaRecorderRef.current;
      if (!recorder || recorder.state === "inactive") {
        resolve(null);
        return;
      }

      recorder.onstop = () => {
        setIsRecording(false);
        setIsPaused(false);
        clearTimer();

        // Merge all collected chunks into a single Blob
        const mimeType = recorder.mimeType || "audio/webm";
        const fullBlob = new Blob(chunksRef.current, { type: mimeType });

        // Upload as a single chunk (index 0) — this is one complete, playable file
        if (fullBlob.size > 0) {
          onChunkRef.current(fullBlob, 0);
        }

        resolve(fullBlob);
      };

      // Just stop — ondataavailable will fire with the complete recording
      recorder.stop();

      // Stop all tracks
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
    });
  }, [clearTimer]);

  const pauseRecording = useCallback(() => {
    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state === "recording") {
      recorder.pause();
      setIsPaused(true);
      clearTimer();
    }
  }, [clearTimer]);

  const resumeRecording = useCallback(() => {
    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state === "paused") {
      recorder.resume();
      setIsPaused(false);

      timerRef.current = setInterval(() => {
        setDuration((prev) => prev + 1);
      }, 1000);
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearTimer();
      const recorder = mediaRecorderRef.current;
      if (recorder && recorder.state !== "inactive") {
        recorder.stop();
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, [clearTimer]);

  return {
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
    isRecording,
    isPaused,
    duration,
  };
}
