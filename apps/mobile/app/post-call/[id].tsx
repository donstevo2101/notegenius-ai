import { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Audio } from "expo-av";
import * as FileSystem from "expo-file-system";
import { supabase } from "../../lib/supabase";
import { apiClient } from "../../lib/api-client";

interface PhoneCallRow {
  id: string;
  contact_name: string | null;
  remote_number: string | null;
  duration_seconds: number | null;
  started_at: string;
  direction: string;
  platform: string;
}

type RecState = "idle" | "recording" | "uploading" | "done";

function formatDuration(seconds: number | null): string {
  if (!seconds) return "—";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export default function PostCallScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [phoneCall, setPhoneCall] = useState<PhoneCallRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [recState, setRecState] = useState<RecState>("idle");
  const [elapsed, setElapsed] = useState(0);
  const [recordingId, setRecordingId] = useState<string | null>(null);

  const recordingRef = useRef<Audio.Recording | null>(null);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!id) return;
    (async () => {
      const { data } = await supabase
        .from("phone_calls")
        .select("id, contact_name, remote_number, duration_seconds, started_at, direction, platform")
        .eq("id", id)
        .single();
      setPhoneCall(data);
      setLoading(false);
    })();
  }, [id]);

  useEffect(() => {
    return () => {
      if (tickRef.current) clearInterval(tickRef.current);
      if (recordingRef.current) {
        recordingRef.current.stopAndUnloadAsync().catch(() => {});
      }
    };
  }, []);

  async function startRecording() {
    try {
      const perm = await Audio.requestPermissionsAsync();
      if (!perm.granted) {
        Alert.alert("Microphone access required");
        return;
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      recordingRef.current = recording;
      setRecState("recording");
      setElapsed(0);

      tickRef.current = setInterval(() => {
        setElapsed((s) => s + 1);
      }, 1000);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Could not start recording";
      Alert.alert("Recording failed", msg);
    }
  }

  async function stopRecording() {
    try {
      const recording = recordingRef.current;
      if (!recording) return;
      if (tickRef.current) clearInterval(tickRef.current);

      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      recordingRef.current = null;

      if (!uri) {
        setRecState("idle");
        return;
      }

      setRecState("uploading");
      await uploadAndTranscribe(uri);
    } catch (err) {
      console.warn("Stop recording error:", err);
      setRecState("idle");
    }
  }

  async function uploadAndTranscribe(localUri: string) {
    if (!phoneCall) return;

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        Alert.alert("Sign in required");
        setRecState("idle");
        return;
      }

      // Create recording row via API
      const { recording } = await apiClient.post<{
        recording: { id: string };
      }>("/api/recordings/from-call", {
        phone_call_id: phoneCall.id,
        source: "phone-notes",
        title: phoneCall.contact_name
          ? `Notes: call with ${phoneCall.contact_name}`
          : "Post-call voice memo",
      });

      setRecordingId(recording.id);

      // Upload audio
      const filename = `${user.id}/${recording.id}/notes.m4a`;
      const blob = await fetch(localUri).then((r) => r.blob());

      const { error: upErr } = await supabase.storage
        .from("recordings")
        .upload(filename, blob, {
          contentType: "audio/m4a",
          upsert: true,
        });

      if (upErr) throw new Error(upErr.message);

      await supabase
        .from("recordings")
        .update({ audio_storage_path: filename, status: "transcribing" })
        .eq("id", recording.id);

      // Trigger transcription (which will trigger summary + actions)
      await apiClient.post(`/api/recordings/${recording.id}/transcribe`);

      // Link back to phone_call
      await supabase
        .from("phone_calls")
        .update({ recording_id: recording.id, notes_added: true })
        .eq("id", phoneCall.id);

      // Clean up local file
      await FileSystem.deleteAsync(localUri, { idempotent: true });

      setRecState("done");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Upload failed";
      Alert.alert("Couldn't save notes", msg);
      setRecState("idle");
    }
  }

  function viewRecording() {
    if (recordingId) {
      router.replace(`/recording/${recordingId}`);
    } else {
      router.back();
    }
  }

  function dismiss() {
    if (phoneCall) {
      supabase
        .from("phone_calls")
        .update({ notes_prompted: true, notes_added: false })
        .eq("id", phoneCall.id);
    }
    router.back();
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color="#3B82F6" />
      </View>
    );
  }

  if (!phoneCall) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>Call not found</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.eyebrow}>
        {phoneCall.direction === "outgoing" ? "After your call" : "After your call"}
      </Text>
      <Text style={styles.title}>
        {phoneCall.contact_name
          ? `with ${phoneCall.contact_name}`
          : phoneCall.remote_number || "Phone call"}
      </Text>
      <Text style={styles.meta}>
        {formatDuration(phoneCall.duration_seconds)} {"\u00B7"}{" "}
        {new Date(phoneCall.started_at).toLocaleTimeString("en-GB", {
          hour: "2-digit",
          minute: "2-digit",
        })}
      </Text>

      <View style={styles.recCard}>
        {recState === "idle" && (
          <>
            <Text style={styles.prompt}>
              Tap record and dictate your notes. I&apos;ll transcribe and pull out
              action items, follow-ups, and CRM updates.
            </Text>
            <TouchableOpacity style={styles.recButton} onPress={startRecording}>
              <View style={styles.recDot} />
            </TouchableOpacity>
            <Text style={styles.recHint}>Start recording</Text>
          </>
        )}

        {recState === "recording" && (
          <>
            <Text style={styles.elapsedText}>{formatDuration(elapsed)}</Text>
            <Text style={styles.prompt}>Recording your notes...</Text>
            <TouchableOpacity
              style={[styles.recButton, styles.recButtonActive]}
              onPress={stopRecording}
            >
              <View style={styles.stopSquare} />
            </TouchableOpacity>
            <Text style={styles.recHint}>Tap to stop</Text>
          </>
        )}

        {recState === "uploading" && (
          <>
            <ActivityIndicator size="large" color="#3B82F6" />
            <Text style={styles.prompt}>Uploading and transcribing...</Text>
          </>
        )}

        {recState === "done" && (
          <>
            <View style={styles.successCircle}>
              <Text style={styles.successCheck}>{"\u2713"}</Text>
            </View>
            <Text style={styles.prompt}>
              Notes saved. Transcription and action extraction are running in the
              background.
            </Text>
            <TouchableOpacity style={styles.viewBtn} onPress={viewRecording}>
              <Text style={styles.viewBtnText}>View recording</Text>
            </TouchableOpacity>
          </>
        )}
      </View>

      {recState === "idle" && (
        <TouchableOpacity style={styles.dismissBtn} onPress={dismiss}>
          <Text style={styles.dismissText}>Skip</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 40,
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff",
  },
  errorText: { fontSize: 16, color: "#6B7280" },
  eyebrow: {
    fontSize: 13,
    color: "#6B7280",
    fontWeight: "500",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 6,
  },
  meta: {
    fontSize: 14,
    color: "#9CA3AF",
    marginBottom: 32,
  },
  recCard: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 24,
  },
  prompt: {
    fontSize: 15,
    color: "#4B5563",
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 32,
    maxWidth: 320,
  },
  recButton: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: "#FEE2E2",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#FCA5A5",
  },
  recButtonActive: {
    backgroundColor: "#EF4444",
    borderColor: "#EF4444",
  },
  recDot: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#EF4444",
  },
  stopSquare: {
    width: 28,
    height: 28,
    borderRadius: 4,
    backgroundColor: "#fff",
  },
  recHint: {
    marginTop: 16,
    fontSize: 14,
    color: "#9CA3AF",
  },
  elapsedText: {
    fontSize: 36,
    fontWeight: "700",
    color: "#EF4444",
    marginBottom: 8,
    fontVariant: ["tabular-nums"],
  },
  successCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "#D1FAE5",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  successCheck: {
    fontSize: 36,
    color: "#065F46",
    fontWeight: "700",
  },
  viewBtn: {
    backgroundColor: "#3B82F6",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  viewBtnText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 15,
  },
  dismissBtn: {
    alignSelf: "center",
    paddingVertical: 12,
  },
  dismissText: {
    fontSize: 14,
    color: "#9CA3AF",
  },
});
