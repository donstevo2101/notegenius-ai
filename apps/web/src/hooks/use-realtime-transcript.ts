"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { RealtimeChannel } from "@supabase/supabase-js";

export interface TranscriptSegment {
  id: string;
  text: string;
  start_ms: number;
  end_ms: number;
  speaker_label?: string;
  confidence?: number;
}

interface UseRealtimeTranscriptReturn {
  segments: TranscriptSegment[];
  isConnected: boolean;
}

export function useRealtimeTranscript(
  recordingId: string | null
): UseRealtimeTranscriptReturn {
  const [segments, setSegments] = useState<TranscriptSegment[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const channelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    if (!recordingId) {
      setSegments([]);
      setIsConnected(false);
      return;
    }

    const supabase = createClient();

    const channel = supabase.channel(`recording:${recordingId}`, {
      config: { broadcast: { self: true } },
    });

    channel
      .on("broadcast", { event: "new_segments" }, (payload) => {
        const newSegments = payload.payload?.segments as
          | TranscriptSegment[]
          | undefined;
        if (newSegments && Array.isArray(newSegments)) {
          setSegments((prev) => [...prev, ...newSegments]);
        }
      })
      .subscribe((status) => {
        setIsConnected(status === "SUBSCRIBED");
      });

    channelRef.current = channel;

    return () => {
      channel.unsubscribe();
      channelRef.current = null;
      setIsConnected(false);
    };
  }, [recordingId]);

  return { segments, isConnected };
}
