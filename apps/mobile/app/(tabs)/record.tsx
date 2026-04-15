import { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Platform,
} from "react-native";
import { Audio } from "expo-av";
import * as FileSystem from "expo-file-system";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { apiClient } from "../../lib/api-client";

type RecordingState = "idle" | "recording" | "paused" | "uploading";

const CHUNK_INTERVAL_MS = 30000; // 30 seconds per chunk

export default function RecordScreen() {
  const router = useRouter();
  const [state, setState] = useState<RecordingState>("idle");
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [recordingId, setRecordingId] = useState<string | null>(null);
  const [chunkIndex, setChunkIndex] = useState(0);

  const recordingRef = useRef<Audio.Recording | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const chunkTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      cleanupTimers();
      if (recordingRef.current) {
        recordingRef.current.stopAndUnloadAsync().catch(() => {});
      }
    };
  }, []);

  function cleanupTimers() {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (chunkTimerRef.current) {
      clearInterval(chunkTimerRef.current);
      chunkTimerRef.current = null;
    }
  }

  function formatTime(totalSeconds: number): string {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, "0")}:${seconds
        .toString()
        .padStart(2, "0")}`;
    }
    return `${minutes.toString().padStart(2, "0")}:${seconds
      .toString()
      .padStart(2, "0")}`;
  }

  async function startRecording() {
    try {
      const permission = await Audio.requestPermissionsAsync();
      if (!permission.granted) {
        Alert.alert(
          "Permission Required",
          "Microphone access is needed to record audio."
        );
        return;
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      // Create a recording entry on the server
      const data = await apiClient.post<{ id: string }>("/api/recordings", {
        title: `Recording ${new Date().toLocaleDateString("en-GB")}`,
      });
      setRecordingId(data.id);
      setChunkIndex(0);

      // Start recording
      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      recordingRef.current = recording;

      setState("recording");
      setElapsedSeconds(0);

      // Start timer
      timerRef.current = setInterval(() => {
        setElapsedSeconds((prev) => prev + 1);
      }, 1000);

      // Start chunk upload timer
      chunkTimerRef.current = setInterval(async () => {
        await uploadCurrentChunk(data.id);
      }, CHUNK_INTERVAL_MS);
    } catch (error) {
      console.error("Failed to start recording:", error);
      Alert.alert("Error", "Failed to start recording. Please try again.");
    }
  }

  async function uploadCurrentChunk(recId: string) {
    if (!recordingRef.current) return;

    try {
      // Stop current recording to get the file
      await recordingRef.current.stopAndUnloadAsync();
      const uri = recordingRef.current.getURI();

      if (uri) {
        const currentChunk = chunkIndex;
        setChunkIndex((prev) => prev + 1);

        // Upload the chunk
        const fileInfo = await FileSystem.getInfoAsync(uri);
        if (fileInfo.exists) {
          const base64 = await FileSystem.readAsStringAsync(uri, {
            encoding: FileSystem.EncodingType.Base64,
          });

          await apiClient.post(`/api/recordings/${recId}/chunks`, {
            chunk_index: currentChunk,
            audio_data: base64,
            content_type: Platform.OS === "ios" ? "audio/m4a" : "audio/mp4",
          });
        }
      }

      // Start a new recording for the next chunk
      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      recordingRef.current = recording;
    } catch (error) {
      console.error("Failed to upload chunk:", error);
    }
  }

  async function pauseRecording() {
    if (!recordingRef.current) return;

    try {
      await recordingRef.current.pauseAsync();
      setState("paused");
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    } catch (error) {
      console.error("Failed to pause recording:", error);
    }
  }

  async function resumeRecording() {
    if (!recordingRef.current) return;

    try {
      await recordingRef.current.startAsync();
      setState("recording");
      timerRef.current = setInterval(() => {
        setElapsedSeconds((prev) => prev + 1);
      }, 1000);
    } catch (error) {
      console.error("Failed to resume recording:", error);
    }
  }

  async function stopRecording() {
    if (!recordingRef.current || !recordingId) return;

    cleanupTimers();
    setState("uploading");

    try {
      // Stop and upload final chunk
      await recordingRef.current.stopAndUnloadAsync();
      const uri = recordingRef.current.getURI();

      if (uri) {
        const fileInfo = await FileSystem.getInfoAsync(uri);
        if (fileInfo.exists) {
          const base64 = await FileSystem.readAsStringAsync(uri, {
            encoding: FileSystem.EncodingType.Base64,
          });

          await apiClient.post(`/api/recordings/${recordingId}/chunks`, {
            chunk_index: chunkIndex,
            audio_data: base64,
            content_type: Platform.OS === "ios" ? "audio/m4a" : "audio/mp4",
            is_final: true,
          });
        }
      }

      // Tell the server recording is complete
      await apiClient.post(`/api/recordings/${recordingId}/complete`, {
        duration: elapsedSeconds,
      });

      recordingRef.current = null;

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
      });

      setState("idle");
      setElapsedSeconds(0);
      setRecordingId(null);

      // Navigate to the recording detail
      router.push(`/recording/${recordingId}`);
    } catch (error) {
      console.error("Failed to stop recording:", error);
      Alert.alert("Error", "Failed to save recording. Please try again.");
      setState("idle");
    }
  }

  return (
    <SafeAreaView style={styles.container} edges={["left", "right"]}>
      <View style={styles.content}>
        {/* Timer */}
        <View style={styles.timerContainer}>
          <Text style={styles.timer}>{formatTime(elapsedSeconds)}</Text>
          {state === "recording" && (
            <View style={styles.liveIndicator}>
              <View style={styles.liveDot} />
              <Text style={styles.liveText}>Recording</Text>
            </View>
          )}
          {state === "paused" && (
            <Text style={styles.pausedText}>Paused</Text>
          )}
          {state === "uploading" && (
            <Text style={styles.uploadingText}>Saving...</Text>
          )}
        </View>

        {/* Main Record Button */}
        <View style={styles.controlsContainer}>
          {state === "idle" ? (
            <TouchableOpacity
              style={styles.recordButton}
              onPress={startRecording}
              activeOpacity={0.8}
            >
              <View style={styles.recordButtonInner} />
            </TouchableOpacity>
          ) : (
            <View style={styles.activeControls}>
              {/* Pause / Resume */}
              {state === "recording" ? (
                <TouchableOpacity
                  style={styles.controlButton}
                  onPress={pauseRecording}
                  activeOpacity={0.7}
                >
                  <Text style={styles.controlIcon}>{"\u23F8\uFE0F"}</Text>
                  <Text style={styles.controlLabel}>Pause</Text>
                </TouchableOpacity>
              ) : state === "paused" ? (
                <TouchableOpacity
                  style={styles.controlButton}
                  onPress={resumeRecording}
                  activeOpacity={0.7}
                >
                  <Text style={styles.controlIcon}>{"\u25B6\uFE0F"}</Text>
                  <Text style={styles.controlLabel}>Resume</Text>
                </TouchableOpacity>
              ) : null}

              {/* Stop Button */}
              {(state === "recording" || state === "paused") && (
                <TouchableOpacity
                  style={styles.stopButton}
                  onPress={stopRecording}
                  activeOpacity={0.8}
                >
                  <View style={styles.stopButtonInner} />
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>

        {/* Hint Text */}
        {state === "idle" && (
          <Text style={styles.hint}>Tap the button to start recording</Text>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  content: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  timerContainer: {
    alignItems: "center",
    marginBottom: 60,
  },
  timer: {
    fontSize: 56,
    fontWeight: "300",
    color: "#111827",
    fontVariant: ["tabular-nums"],
  },
  liveIndicator: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 12,
  },
  liveDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#EF4444",
    marginRight: 8,
  },
  liveText: {
    fontSize: 14,
    color: "#EF4444",
    fontWeight: "600",
  },
  pausedText: {
    fontSize: 14,
    color: "#F59E0B",
    fontWeight: "600",
    marginTop: 12,
  },
  uploadingText: {
    fontSize: 14,
    color: "#3B82F6",
    fontWeight: "600",
    marginTop: 12,
  },
  controlsContainer: {
    alignItems: "center",
    marginBottom: 40,
  },
  recordButton: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "#FEE2E2",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 4,
    borderColor: "#EF4444",
  },
  recordButtonInner: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#EF4444",
  },
  activeControls: {
    flexDirection: "row",
    alignItems: "center",
    gap: 40,
  },
  controlButton: {
    alignItems: "center",
  },
  controlIcon: {
    fontSize: 36,
    marginBottom: 8,
  },
  controlLabel: {
    fontSize: 13,
    color: "#6B7280",
    fontWeight: "500",
  },
  stopButton: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "#FEE2E2",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 4,
    borderColor: "#EF4444",
  },
  stopButtonInner: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: "#EF4444",
  },
  hint: {
    fontSize: 14,
    color: "#9CA3AF",
  },
});
