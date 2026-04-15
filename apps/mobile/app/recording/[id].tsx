import { useCallback, useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useLocalSearchParams } from "expo-router";
import { Audio, AVPlaybackStatus } from "expo-av";
import { apiClient } from "../../lib/api-client";

interface TranscriptSegment {
  id: string;
  start_time: number;
  end_time: number;
  text: string;
  speaker?: string;
}

interface ActionItem {
  id: string;
  text: string;
  completed: boolean;
}

interface Summary {
  overview: string;
  action_items: ActionItem[];
  decisions: string[];
}

interface RecordingDetail {
  id: string;
  title: string;
  created_at: string;
  duration: number | null;
  status: string;
  audio_url: string | null;
  transcript: TranscriptSegment[];
  summary: Summary | null;
}

interface QAMessage {
  role: "user" | "assistant";
  content: string;
}

function formatTimestamp(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

function formatDuration(seconds: number | null): string {
  if (!seconds) return "--:--";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

export default function RecordingDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [recording, setRecording] = useState<RecordingDetail | null>(null);
  const [loading, setLoading] = useState(true);

  // Audio player state
  const soundRef = useRef<Audio.Sound | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackPosition, setPlaybackPosition] = useState(0);
  const [playbackDuration, setPlaybackDuration] = useState(0);

  // Q&A state
  const [qaMessages, setQaMessages] = useState<QAMessage[]>([]);
  const [qaInput, setQaInput] = useState("");
  const [qaLoading, setQaLoading] = useState(false);

  const fetchRecording = useCallback(async () => {
    try {
      const data = await apiClient.get<RecordingDetail>(
        `/api/recordings/${id}`
      );
      setRecording(data);
    } catch (error) {
      console.error("Failed to fetch recording:", error);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchRecording();
    return () => {
      if (soundRef.current) {
        soundRef.current.unloadAsync();
      }
    };
  }, [fetchRecording]);

  function onPlaybackStatusUpdate(status: AVPlaybackStatus) {
    if (!status.isLoaded) return;
    setPlaybackPosition(status.positionMillis / 1000);
    setPlaybackDuration((status.durationMillis || 0) / 1000);
    setIsPlaying(status.isPlaying);

    if (status.didJustFinish) {
      setIsPlaying(false);
      setPlaybackPosition(0);
    }
  }

  async function handlePlayPause() {
    if (!recording?.audio_url) return;

    if (!soundRef.current) {
      try {
        const { sound } = await Audio.Sound.createAsync(
          { uri: recording.audio_url },
          { shouldPlay: true },
          onPlaybackStatusUpdate
        );
        soundRef.current = sound;
        setIsPlaying(true);
      } catch (error) {
        console.error("Failed to load audio:", error);
      }
      return;
    }

    if (isPlaying) {
      await soundRef.current.pauseAsync();
    } else {
      await soundRef.current.playAsync();
    }
  }

  async function handleSeek(position: number) {
    if (soundRef.current) {
      await soundRef.current.setPositionAsync(position * 1000);
    }
  }

  async function handleSendQA() {
    const question = qaInput.trim();
    if (!question || qaLoading) return;

    setQaInput("");
    const newMessages: QAMessage[] = [
      ...qaMessages,
      { role: "user", content: question },
    ];
    setQaMessages(newMessages);
    setQaLoading(true);

    try {
      const response = await apiClient.post<{ answer: string }>(
        `/api/recordings/${id}/qa`,
        { question }
      );
      setQaMessages([
        ...newMessages,
        { role: "assistant", content: response.answer },
      ]);
    } catch (error) {
      setQaMessages([
        ...newMessages,
        {
          role: "assistant",
          content: "Sorry, I could not process your question. Please try again.",
        },
      ]);
    } finally {
      setQaLoading(false);
    }
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#3B82F6" />
      </View>
    );
  }

  if (!recording) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>Recording not found</Text>
      </View>
    );
  }

  const seekPercentage =
    playbackDuration > 0 ? (playbackPosition / playbackDuration) * 100 : 0;

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={100}
    >
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Title & Meta */}
        <View style={styles.header}>
          <Text style={styles.title}>
            {recording.title || "Untitled Recording"}
          </Text>
          <Text style={styles.meta}>
            {new Date(recording.created_at).toLocaleDateString("en-GB", {
              day: "numeric",
              month: "long",
              year: "numeric",
            })}{" "}
            {"\u00B7"} {formatDuration(recording.duration)}
          </Text>
        </View>

        {/* Audio Player */}
        {recording.audio_url && (
          <View style={styles.playerCard}>
            <View style={styles.playerControls}>
              <TouchableOpacity
                style={styles.playButton}
                onPress={handlePlayPause}
                activeOpacity={0.7}
              >
                <Text style={styles.playButtonText}>
                  {isPlaying ? "\u23F8\uFE0F" : "\u25B6\uFE0F"}
                </Text>
              </TouchableOpacity>

              <View style={styles.seekContainer}>
                <TouchableOpacity
                  style={styles.seekTrack}
                  onPress={(e) => {
                    const { locationX } = e.nativeEvent;
                    const trackWidth = 250;
                    const ratio = Math.max(
                      0,
                      Math.min(1, locationX / trackWidth)
                    );
                    handleSeek(ratio * playbackDuration);
                  }}
                  activeOpacity={1}
                >
                  <View
                    style={[
                      styles.seekProgress,
                      { width: `${seekPercentage}%` },
                    ]}
                  />
                </TouchableOpacity>
                <View style={styles.timeRow}>
                  <Text style={styles.timeText}>
                    {formatTimestamp(playbackPosition)}
                  </Text>
                  <Text style={styles.timeText}>
                    {formatTimestamp(playbackDuration)}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        )}

        {/* Transcript */}
        {recording.transcript && recording.transcript.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Transcript</Text>
            <View style={styles.transcriptCard}>
              {recording.transcript.map((segment) => (
                <TouchableOpacity
                  key={segment.id}
                  style={styles.transcriptSegment}
                  onPress={() => handleSeek(segment.start_time)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.transcriptTimestamp}>
                    {formatTimestamp(segment.start_time)}
                  </Text>
                  <View style={styles.transcriptContent}>
                    {segment.speaker && (
                      <Text style={styles.transcriptSpeaker}>
                        {segment.speaker}
                      </Text>
                    )}
                    <Text style={styles.transcriptText}>{segment.text}</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* Summary */}
        {recording.summary && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Summary</Text>

            {/* Overview */}
            <View style={styles.summaryCard}>
              <Text style={styles.summarySubtitle}>Overview</Text>
              <Text style={styles.summaryText}>
                {recording.summary.overview}
              </Text>
            </View>

            {/* Action Items */}
            {recording.summary.action_items &&
              recording.summary.action_items.length > 0 && (
                <View style={[styles.summaryCard, { marginTop: 12 }]}>
                  <Text style={styles.summarySubtitle}>Action Items</Text>
                  {recording.summary.action_items.map((item) => (
                    <View key={item.id} style={styles.actionItem}>
                      <View
                        style={[
                          styles.checkbox,
                          item.completed && styles.checkboxChecked,
                        ]}
                      >
                        {item.completed && (
                          <Text style={styles.checkmark}>{"\u2713"}</Text>
                        )}
                      </View>
                      <Text
                        style={[
                          styles.actionItemText,
                          item.completed && styles.actionItemCompleted,
                        ]}
                      >
                        {item.text}
                      </Text>
                    </View>
                  ))}
                </View>
              )}

            {/* Decisions */}
            {recording.summary.decisions &&
              recording.summary.decisions.length > 0 && (
                <View style={[styles.summaryCard, { marginTop: 12 }]}>
                  <Text style={styles.summarySubtitle}>Key Decisions</Text>
                  {recording.summary.decisions.map((decision, index) => (
                    <View key={index} style={styles.decisionItem}>
                      <Text style={styles.decisionBullet}>{"\u2022"}</Text>
                      <Text style={styles.decisionText}>{decision}</Text>
                    </View>
                  ))}
                </View>
              )}
          </View>
        )}

        {/* Q&A Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Ask a Question</Text>
          <View style={styles.qaCard}>
            {qaMessages.length === 0 && (
              <Text style={styles.qaHint}>
                Ask anything about this recording and the AI will answer based on
                the transcript.
              </Text>
            )}

            {qaMessages.map((msg, index) => (
              <View
                key={index}
                style={[
                  styles.qaMessage,
                  msg.role === "user"
                    ? styles.qaUserMessage
                    : styles.qaAssistantMessage,
                ]}
              >
                <Text
                  style={[
                    styles.qaMessageText,
                    msg.role === "user"
                      ? styles.qaUserText
                      : styles.qaAssistantText,
                  ]}
                >
                  {msg.content}
                </Text>
              </View>
            ))}

            {qaLoading && (
              <View style={styles.qaLoadingContainer}>
                <ActivityIndicator size="small" color="#3B82F6" />
                <Text style={styles.qaLoadingText}>Thinking...</Text>
              </View>
            )}

            <View style={styles.qaInputRow}>
              <TextInput
                style={styles.qaInput}
                placeholder="Type your question..."
                placeholderTextColor="#9CA3AF"
                value={qaInput}
                onChangeText={setQaInput}
                multiline
                maxLength={500}
              />
              <TouchableOpacity
                style={[
                  styles.qaSendButton,
                  (!qaInput.trim() || qaLoading) && styles.qaSendButtonDisabled,
                ]}
                onPress={handleSendQA}
                disabled={!qaInput.trim() || qaLoading}
              >
                <Text style={styles.qaSendButtonText}>{"\u2191"}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
  },
  errorText: {
    fontSize: 16,
    color: "#6B7280",
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 6,
  },
  meta: {
    fontSize: 14,
    color: "#6B7280",
  },

  // Audio Player
  playerCard: {
    backgroundColor: "#F9FAFB",
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: "#F3F4F6",
  },
  playerControls: {
    flexDirection: "row",
    alignItems: "center",
  },
  playButton: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "#EFF6FF",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 14,
  },
  playButtonText: {
    fontSize: 24,
  },
  seekContainer: {
    flex: 1,
  },
  seekTrack: {
    height: 6,
    backgroundColor: "#E5E7EB",
    borderRadius: 3,
    overflow: "hidden",
  },
  seekProgress: {
    height: "100%",
    backgroundColor: "#3B82F6",
    borderRadius: 3,
  },
  timeRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 6,
  },
  timeText: {
    fontSize: 12,
    color: "#9CA3AF",
    fontVariant: ["tabular-nums"],
  },

  // Sections
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 12,
  },

  // Transcript
  transcriptCard: {
    backgroundColor: "#F9FAFB",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#F3F4F6",
    maxHeight: 300,
  },
  transcriptSegment: {
    flexDirection: "row",
    marginBottom: 12,
  },
  transcriptTimestamp: {
    fontSize: 12,
    color: "#3B82F6",
    fontWeight: "600",
    width: 48,
    paddingTop: 2,
    fontVariant: ["tabular-nums"],
  },
  transcriptContent: {
    flex: 1,
  },
  transcriptSpeaker: {
    fontSize: 13,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 2,
  },
  transcriptText: {
    fontSize: 14,
    color: "#4B5563",
    lineHeight: 20,
  },

  // Summary
  summaryCard: {
    backgroundColor: "#F9FAFB",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#F3F4F6",
  },
  summarySubtitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 8,
  },
  summaryText: {
    fontSize: 14,
    color: "#4B5563",
    lineHeight: 22,
  },
  actionItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 10,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: "#D1D5DB",
    marginRight: 10,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 1,
  },
  checkboxChecked: {
    backgroundColor: "#3B82F6",
    borderColor: "#3B82F6",
  },
  checkmark: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
  },
  actionItemText: {
    fontSize: 14,
    color: "#4B5563",
    flex: 1,
    lineHeight: 20,
  },
  actionItemCompleted: {
    textDecorationLine: "line-through",
    color: "#9CA3AF",
  },
  decisionItem: {
    flexDirection: "row",
    marginBottom: 8,
  },
  decisionBullet: {
    fontSize: 14,
    color: "#3B82F6",
    marginRight: 8,
    lineHeight: 20,
  },
  decisionText: {
    fontSize: 14,
    color: "#4B5563",
    flex: 1,
    lineHeight: 20,
  },

  // Q&A
  qaCard: {
    backgroundColor: "#F9FAFB",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#F3F4F6",
  },
  qaHint: {
    fontSize: 14,
    color: "#9CA3AF",
    textAlign: "center",
    marginBottom: 16,
    lineHeight: 20,
  },
  qaMessage: {
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    maxWidth: "85%",
  },
  qaUserMessage: {
    backgroundColor: "#3B82F6",
    alignSelf: "flex-end",
  },
  qaAssistantMessage: {
    backgroundColor: "#FFFFFF",
    alignSelf: "flex-start",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  qaMessageText: {
    fontSize: 14,
    lineHeight: 20,
  },
  qaUserText: {
    color: "#FFFFFF",
  },
  qaAssistantText: {
    color: "#374151",
  },
  qaLoadingContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  qaLoadingText: {
    fontSize: 13,
    color: "#9CA3AF",
    marginLeft: 8,
  },
  qaInputRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    marginTop: 8,
  },
  qaInput: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: "#111827",
    maxHeight: 100,
    marginRight: 8,
  },
  qaSendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#3B82F6",
    justifyContent: "center",
    alignItems: "center",
  },
  qaSendButtonDisabled: {
    opacity: 0.5,
  },
  qaSendButtonText: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "700",
  },
});
