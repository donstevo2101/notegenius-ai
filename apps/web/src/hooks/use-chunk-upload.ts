"use client";

import { useCallback, useEffect, useRef, useState } from "react";

interface QueueItem {
  blob: Blob;
  index: number;
  retries: number;
}

interface UseChunkUploadReturn {
  addChunk: (blob: Blob, index: number) => void;
  waitForUploads: () => Promise<void>;
  uploadedCount: number;
  pendingCount: number;
  isUploading: boolean;
  error: string | null;
}

const MAX_RETRIES = 3;
const BASE_DELAY_MS = 1000;

export function useChunkUpload(
  recordingId: string | null
): UseChunkUploadReturn {
  const [uploadedCount, setUploadedCount] = useState(0);
  const [pendingCount, setPendingCount] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const queueRef = useRef<QueueItem[]>([]);
  const processingRef = useRef(false);
  const recordingIdRef = useRef(recordingId);

  useEffect(() => {
    recordingIdRef.current = recordingId;
  }, [recordingId]);

  const processQueue = useCallback(async () => {
    if (processingRef.current) return;
    if (queueRef.current.length === 0) {
      setIsUploading(false);
      return;
    }

    processingRef.current = true;
    setIsUploading(true);

    while (queueRef.current.length > 0) {
      const item = queueRef.current[0];
      const id = recordingIdRef.current;

      if (!id) {
        // No recording ID yet — wait and retry
        processingRef.current = false;
        setTimeout(() => processQueue(), 500);
        return;
      }

      try {
        const formData = new FormData();
        formData.append("chunk", item.blob, `chunk_${String(item.index).padStart(3, "0")}.webm`);
        formData.append("chunk_index", String(item.index));

        const response = await fetch(`/api/recordings/${id}/upload-chunk`, {
          method: "POST",
          body: formData,
        });

        if (!response.ok) {
          const body = await response.json().catch(() => ({}));
          throw new Error(body.error || `Upload failed with status ${response.status}`);
        }

        // Success — remove from queue
        queueRef.current.shift();
        setUploadedCount((prev) => prev + 1);
        setPendingCount(queueRef.current.length);
        setError(null);
      } catch (err) {
        item.retries += 1;

        if (item.retries >= MAX_RETRIES) {
          const message = err instanceof Error ? err.message : "Upload failed";
          setError(`Chunk ${item.index} failed after ${MAX_RETRIES} retries: ${message}`);
          // Remove the failed chunk and continue with the rest
          queueRef.current.shift();
          setPendingCount(queueRef.current.length);
        } else {
          // Exponential backoff
          const delay = BASE_DELAY_MS * Math.pow(2, item.retries - 1);
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }

    processingRef.current = false;
    setIsUploading(false);
  }, []);

  const addChunk = useCallback(
    (blob: Blob, index: number) => {
      queueRef.current.push({ blob, index, retries: 0 });
      setPendingCount(queueRef.current.length);
      processQueue();
    },
    [processQueue]
  );

  const waitForUploads = useCallback(async () => {
    const maxWait = 30000;
    const start = Date.now();
    while (
      (queueRef.current.length > 0 || processingRef.current) &&
      Date.now() - start < maxWait
    ) {
      await new Promise((r) => setTimeout(r, 300));
    }
  }, []);

  return {
    addChunk,
    waitForUploads,
    uploadedCount,
    pendingCount,
    isUploading,
    error,
  };
}
