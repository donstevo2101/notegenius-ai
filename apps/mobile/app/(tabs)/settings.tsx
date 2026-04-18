import { useEffect, useState } from "react";
import {
  View,
  Text,
  Switch,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
  Alert,
} from "react-native";
import { supabase } from "../../lib/supabase";
import CallDetector from "../../modules/call-detector/src";

export default function SettingsScreen() {
  const [loading, setLoading] = useState(true);
  const [callDetectionEnabled, setCallDetectionEnabled] = useState(false);
  const [promptForNotes, setPromptForNotes] = useState(true);
  const [autoRecordAndroid, setAutoRecordAndroid] = useState(false);
  const [autoEmailSummaries, setAutoEmailSummaries] = useState(false);
  const [autoExtractActions, setAutoExtractActions] = useState(true);
  const [permissionsGranted, setPermissionsGranted] = useState(false);

  useEffect(() => {
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from("profiles")
        .select(
          "call_detection_enabled, prompt_for_notes_after_call, auto_record_android_calls, auto_email_summaries, auto_extract_actions"
        )
        .eq("id", user.id)
        .single();

      if (data) {
        setCallDetectionEnabled(!!data.call_detection_enabled);
        setPromptForNotes(data.prompt_for_notes_after_call !== false);
        setAutoRecordAndroid(!!data.auto_record_android_calls);
        setAutoEmailSummaries(!!data.auto_email_summaries);
        setAutoExtractActions(data.auto_extract_actions !== false);
      }

      const perm = await CallDetector.getPermissions();
      setPermissionsGranted(perm.granted);
      setLoading(false);
    })();
  }, []);

  async function updateSetting(field: string, value: boolean) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from("profiles").update({ [field]: value }).eq("id", user.id);
  }

  async function toggleCallDetection(value: boolean) {
    if (value && !permissionsGranted) {
      const perm = await CallDetector.requestPermissions();
      setPermissionsGranted(perm.granted);
      if (!perm.granted) {
        Alert.alert(
          "Permissions required",
          Platform.OS === "ios"
            ? "Please grant microphone and notification access in Settings to enable call detection."
            : "Please grant phone, microphone, and notification access to enable call detection."
        );
        return;
      }
    }
    setCallDetectionEnabled(value);
    await updateSetting("call_detection_enabled", value);
  }

  if (loading) return null;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.sectionLabel}>Call detection</Text>
      <View style={styles.card}>
        <Row
          title="Detect phone calls"
          subtitle={
            Platform.OS === "ios"
              ? "Detect when calls happen and prompt for notes after"
              : "Detect calls and optionally record audio"
          }
          value={callDetectionEnabled}
          onValueChange={toggleCallDetection}
        />
        <Divider />
        <Row
          title="Prompt for notes after call"
          subtitle="Show a notification to dictate a voice memo"
          value={promptForNotes}
          onValueChange={(v) => {
            setPromptForNotes(v);
            updateSetting("prompt_for_notes_after_call", v);
          }}
          disabled={!callDetectionEnabled}
        />
        {Platform.OS === "android" && (
          <>
            <Divider />
            <Row
              title="Auto-record call audio (Android)"
              subtitle="Records both sides where supported by your device"
              value={autoRecordAndroid}
              onValueChange={(v) => {
                setAutoRecordAndroid(v);
                updateSetting("auto_record_android_calls", v);
              }}
              disabled={!callDetectionEnabled}
            />
          </>
        )}
      </View>

      {Platform.OS === "ios" && callDetectionEnabled && (
        <View style={styles.infoBox}>
          <Text style={styles.infoText}>
            iOS does not allow apps to record phone call audio. After each call
            ends, you&apos;ll get a notification to dictate notes — those notes
            are transcribed and analysed exactly like a recording.
          </Text>
        </View>
      )}

      <Text style={styles.sectionLabel}>AI processing</Text>
      <View style={styles.card}>
        <Row
          title="Extract actions automatically"
          subtitle="CRM updates, follow-up emails, calendar events"
          value={autoExtractActions}
          onValueChange={(v) => {
            setAutoExtractActions(v);
            updateSetting("auto_extract_actions", v);
          }}
        />
        <Divider />
        <Row
          title="Email me a summary"
          subtitle="After every recording is processed"
          value={autoEmailSummaries}
          onValueChange={(v) => {
            setAutoEmailSummaries(v);
            updateSetting("auto_email_summaries", v);
          }}
        />
      </View>

      <TouchableOpacity
        style={styles.signOut}
        onPress={async () => {
          await supabase.auth.signOut();
        }}
      >
        <Text style={styles.signOutText}>Sign out</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

interface RowProps {
  title: string;
  subtitle?: string;
  value: boolean;
  onValueChange: (v: boolean) => void;
  disabled?: boolean;
}

function Row({ title, subtitle, value, onValueChange, disabled }: RowProps) {
  return (
    <View style={[styles.row, disabled && { opacity: 0.5 }]}>
      <View style={styles.rowText}>
        <Text style={styles.rowTitle}>{title}</Text>
        {subtitle && <Text style={styles.rowSubtitle}>{subtitle}</Text>}
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        disabled={disabled}
        trackColor={{ false: "#E5E7EB", true: "#3B82F6" }}
      />
    </View>
  );
}

function Divider() {
  return <View style={styles.divider} />;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F9FAFB" },
  content: { padding: 20, paddingBottom: 60 },
  sectionLabel: {
    fontSize: 12,
    color: "#6B7280",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    fontWeight: "600",
    marginBottom: 8,
    marginTop: 16,
    paddingHorizontal: 4,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#F3F4F6",
    overflow: "hidden",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  rowText: { flex: 1, marginRight: 12 },
  rowTitle: { fontSize: 15, color: "#111827", fontWeight: "500" },
  rowSubtitle: { fontSize: 13, color: "#6B7280", marginTop: 2 },
  divider: { height: 1, backgroundColor: "#F3F4F6", marginLeft: 16 },
  infoBox: {
    backgroundColor: "#EFF6FF",
    borderRadius: 12,
    padding: 14,
    marginTop: 12,
    borderWidth: 1,
    borderColor: "#DBEAFE",
  },
  infoText: {
    fontSize: 13,
    color: "#1E40AF",
    lineHeight: 19,
  },
  signOut: {
    marginTop: 32,
    backgroundColor: "#fff",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#FEE2E2",
  },
  signOutText: { color: "#EF4444", fontSize: 15, fontWeight: "500" },
});
