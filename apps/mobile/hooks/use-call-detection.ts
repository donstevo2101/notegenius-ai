import { useEffect, useRef, useState, useCallback } from "react";
import { Platform, AppState } from "react-native";
import * as Notifications from "expo-notifications";
import * as FileSystem from "expo-file-system";
import CallDetector, {
  callEvents,
  CallEventPayload,
  CallState,
} from "../modules/call-detector/src";
import { apiClient } from "../lib/api-client";
import { supabase } from "../lib/supabase";

interface ActiveCall {
  phoneCallId: string | null;
  startedAt: number;
  connectedAt: number | null;
  direction: "incoming" | "outgoing" | "unknown";
  remoteNumber: string | null;
  contactName: string | null;
  androidRecordingPath: string | null;
}

interface UseCallDetectionOptions {
  enabled: boolean;
  promptForNotes?: boolean;
  autoRecordAndroid?: boolean;
  onCallEnded?: (phoneCallId: string) => void;
}

interface UseCallDetectionReturn {
  isMonitoring: boolean;
  activeCall: ActiveCall | null;
  lastEvent: CallEventPayload | null;
  permissionsGranted: boolean;
  requestPermissions: () => Promise<boolean>;
}

/**
 * Detect phone calls and persist them to Supabase.
 *
 * On iOS: detects state only (cannot access caller ID or audio).
 * On Android: detects state + caller number + (optionally) records VOICE_CALL audio.
 *
 * After a call ends, schedules a local notification prompting the user
 * to dictate a voice memo about the call. Tapping the notification opens
 * the in-app post-call screen.
 */
export function useCallDetection({
  enabled,
  promptForNotes = true,
  autoRecordAndroid = false,
  onCallEnded,
}: UseCallDetectionOptions): UseCallDetectionReturn {
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [activeCall, setActiveCall] = useState<ActiveCall | null>(null);
  const [lastEvent, setLastEvent] = useState<CallEventPayload | null>(null);
  const [permissionsGranted, setPermissionsGranted] = useState(false);

  // Hold latest activeCall in a ref so the event handler always sees fresh state
  const activeCallRef = useRef<ActiveCall | null>(null);
  activeCallRef.current = activeCall;

  const requestPermissions = useCallback(async (): Promise<boolean> => {
    const status = await CallDetector.requestPermissions();
    const notifGranted = await Notifications.requestPermissionsAsync();
    const ok = status.granted && notifGranted.granted;
    setPermissionsGranted(ok);
    return ok;
  }, []);

  const persistCallStart = useCallback(
    async (event: CallEventPayload): Promise<string | null> => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) return null;

        const { data, error } = await supabase
          .from("phone_calls")
          .insert({
            user_id: user.id,
            platform: Platform.OS as "ios" | "android",
            direction: event.direction,
            state: event.state,
            remote_number: event.remoteNumber,
            contact_name: event.contactName,
            started_at: new Date(event.timestamp).toISOString(),
            connected_at:
              event.state === "connected"
                ? new Date(event.timestamp).toISOString()
                : null,
          })
          .select("id")
          .single();

        if (error) {
          console.warn("Failed to persist call start:", error.message);
          return null;
        }
        return data.id;
      } catch (err) {
        console.warn("persistCallStart error:", err);
        return null;
      }
    },
    []
  );

  const persistCallEnd = useCallback(
    async (
      phoneCallId: string,
      finalState: CallState,
      endedAt: number,
      startedAt: number,
      androidPath?: string | null
    ) => {
      try {
        const durationSec = Math.max(
          0,
          Math.round((endedAt - startedAt) / 1000)
        );

        await supabase
          .from("phone_calls")
          .update({
            state: finalState,
            ended_at: new Date(endedAt).toISOString(),
            duration_seconds: durationSec,
            android_audio_path: androidPath ?? null,
          })
          .eq("id", phoneCallId);
      } catch (err) {
        console.warn("persistCallEnd error:", err);
      }
    },
    []
  );

  const promptNotes = useCallback(
    async (phoneCallId: string, contactName: string | null) => {
      try {
        await supabase
          .from("phone_calls")
          .update({ notes_prompted: true })
          .eq("id", phoneCallId);

        await Notifications.scheduleNotificationAsync({
          content: {
            title: "Add notes from your call",
            body: contactName
              ? `Tap to dictate notes about your call with ${contactName}`
              : "Tap to dictate a voice memo about your recent call",
            data: { phoneCallId, type: "post_call_notes" },
            sound: "default",
          },
          trigger: null, // immediate
        });
      } catch (err) {
        console.warn("Failed to prompt for notes:", err);
      }
    },
    []
  );

  const handleEvent = useCallback(
    async (event: CallEventPayload) => {
      setLastEvent(event);

      const current = activeCallRef.current;

      if (event.state === "ringing") {
        // Persist the start of the call
        const phoneCallId = await persistCallStart(event);
        const next: ActiveCall = {
          phoneCallId,
          startedAt: event.timestamp,
          connectedAt: null,
          direction: event.direction,
          remoteNumber: event.remoteNumber,
          contactName: event.contactName,
          androidRecordingPath: null,
        };
        setActiveCall(next);
      } else if (event.state === "connected") {
        if (!current) {
          // We missed the ringing event — persist now
          const phoneCallId = await persistCallStart(event);
          const next: ActiveCall = {
            phoneCallId,
            startedAt: event.timestamp,
            connectedAt: event.timestamp,
            direction: event.direction,
            remoteNumber: event.remoteNumber,
            contactName: event.contactName,
            androidRecordingPath: null,
          };
          setActiveCall(next);

          if (Platform.OS === "android" && autoRecordAndroid) {
            await tryStartAndroidRecording(next);
          }
        } else {
          const next = { ...current, connectedAt: event.timestamp };

          // Update remote number if it became available now (Android sometimes does this)
          if (event.remoteNumber && !current.remoteNumber) {
            next.remoteNumber = event.remoteNumber;
          }

          setActiveCall(next);

          if (current.phoneCallId) {
            await supabase
              .from("phone_calls")
              .update({
                state: "connected",
                connected_at: new Date(event.timestamp).toISOString(),
                remote_number: next.remoteNumber,
              })
              .eq("id", current.phoneCallId);
          }

          if (Platform.OS === "android" && autoRecordAndroid) {
            await tryStartAndroidRecording(next);
          }
        }
      } else if (event.state === "ended" || event.state === "missed") {
        // Stop Android recording if active
        let recordingPath: string | null = null;
        if (Platform.OS === "android" && CallDetector.isRecording()) {
          try {
            recordingPath = await CallDetector.stopCallRecording();
          } catch (err) {
            console.warn("Failed to stop recording:", err);
          }
        }

        const startedAt = current?.startedAt ?? event.timestamp;
        const phoneCallId = current?.phoneCallId ?? null;

        if (phoneCallId) {
          await persistCallEnd(
            phoneCallId,
            event.state,
            event.timestamp,
            startedAt,
            recordingPath
          );

          // Upload the Android recording immediately if we have one
          if (recordingPath && Platform.OS === "android") {
            uploadAndroidRecording(phoneCallId, recordingPath).catch((err) =>
              console.warn("Upload failed:", err)
            );
          } else if (event.state === "ended" && promptForNotes) {
            // iOS or Android-without-audio → prompt for voice memo
            await promptNotes(phoneCallId, current?.contactName ?? null);
          }

          onCallEnded?.(phoneCallId);
        }

        setActiveCall(null);
      }
    },
    [persistCallStart, persistCallEnd, promptNotes, autoRecordAndroid, promptForNotes, onCallEnded]
  );

  const tryStartAndroidRecording = useCallback(
    async (call: ActiveCall) => {
      try {
        const filename = `call_${call.phoneCallId ?? "unknown"}_${Date.now()}.m4a`;
        const path = await CallDetector.startCallRecording(filename);
        setActiveCall((c) => (c ? { ...c, androidRecordingPath: path } : c));
      } catch (err) {
        console.warn("Could not start call recording:", err);
      }
    },
    []
  );

  // Setup permissions check + monitoring lifecycle
  useEffect(() => {
    if (!enabled) {
      if (CallDetector.isMonitoring()) {
        CallDetector.stopMonitoring().catch(() => {});
        setIsMonitoring(false);
      }
      return;
    }

    let cancelled = false;
    (async () => {
      const status = await CallDetector.getPermissions();
      if (!status.granted) {
        setPermissionsGranted(false);
        return;
      }
      setPermissionsGranted(true);

      try {
        await CallDetector.startMonitoring();
        if (!cancelled) setIsMonitoring(true);
      } catch (err) {
        console.warn("Failed to start monitoring:", err);
      }
    })();

    return () => {
      cancelled = true;
      if (CallDetector.isMonitoring()) {
        CallDetector.stopMonitoring().catch(() => {});
      }
      setIsMonitoring(false);
    };
  }, [enabled]);

  // Subscribe to call events
  useEffect(() => {
    if (!isMonitoring) return;
    const sub = callEvents.addListener("onCallEvent", handleEvent);
    return () => sub.remove();
  }, [isMonitoring, handleEvent]);

  // Re-check permissions on app foreground
  useEffect(() => {
    const sub = AppState.addEventListener("change", async (state) => {
      if (state === "active") {
        const status = await CallDetector.getPermissions();
        setPermissionsGranted(status.granted);
      }
    });
    return () => sub.remove();
  }, []);

  return {
    isMonitoring,
    activeCall,
    lastEvent,
    permissionsGranted,
    requestPermissions,
  };
}

/**
 * Upload an Android-recorded call audio file to the existing
 * NoteGenius transcription pipeline. Creates a recording row and
 * triggers transcription.
 */
async function uploadAndroidRecording(
  phoneCallId: string,
  localPath: string
): Promise<void> {
  try {
    const info = await FileSystem.getInfoAsync(localPath);
    if (!info.exists) return;

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    // 1) Create recording shell
    const { recording } = await apiClient.post<{
      recording: { id: string };
    }>("/api/recordings/from-call", {
      phone_call_id: phoneCallId,
      source: "phone-android",
    });

    // 2) Upload audio file directly to Supabase Storage
    const fileName = `${user.id}/${recording.id}/audio.m4a`;
    const fileBlob = await fetch(`file://${localPath}`).then((r) => r.blob());

    const { error: uploadErr } = await supabase.storage
      .from("recordings")
      .upload(fileName, fileBlob, {
        contentType: "audio/m4a",
        upsert: true,
      });

    if (uploadErr) {
      console.warn("Storage upload failed:", uploadErr.message);
      return;
    }

    // 3) Update recording with storage path and trigger transcription
    await supabase
      .from("recordings")
      .update({
        audio_storage_path: fileName,
        status: "transcribing",
      })
      .eq("id", recording.id);

    await apiClient.post(`/api/recordings/${recording.id}/transcribe`);

    // 4) Link recording to phone_call
    await supabase
      .from("phone_calls")
      .update({ recording_id: recording.id })
      .eq("id", phoneCallId);

    // 5) Clean up local file
    await FileSystem.deleteAsync(localPath, { idempotent: true });
  } catch (err) {
    console.warn("uploadAndroidRecording error:", err);
  }
}
