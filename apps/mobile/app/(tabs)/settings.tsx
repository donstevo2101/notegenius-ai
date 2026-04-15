import { useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Switch,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { supabase } from "../../lib/supabase";
import { apiClient } from "../../lib/api-client";

interface UserProfile {
  full_name: string;
  email: string;
  language: string;
  auto_email: boolean;
  plan: string;
}

const LANGUAGES = [
  { label: "English", value: "en" },
  { label: "Spanish", value: "es" },
  { label: "French", value: "fr" },
  { label: "German", value: "de" },
  { label: "Portuguese", value: "pt" },
];

export default function SettingsScreen() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [autoEmail, setAutoEmail] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState("en");
  const [showLanguagePicker, setShowLanguagePicker] = useState(false);

  useEffect(() => {
    fetchProfile();
  }, []);

  async function fetchProfile() {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        try {
          const settings = await apiClient.get<{
            language: string;
            auto_email: boolean;
            plan: string;
          }>("/api/user/settings");

          setProfile({
            full_name: user.user_metadata?.full_name || "User",
            email: user.email || "",
            language: settings.language || "en",
            auto_email: settings.auto_email ?? false,
            plan: settings.plan || "free",
          });
          setAutoEmail(settings.auto_email ?? false);
          setSelectedLanguage(settings.language || "en");
        } catch {
          setProfile({
            full_name: user.user_metadata?.full_name || "User",
            email: user.email || "",
            language: "en",
            auto_email: false,
            plan: "free",
          });
        }
      }
    } catch (error) {
      console.error("Failed to fetch profile:", error);
    } finally {
      setLoading(false);
    }
  }

  async function handleToggleAutoEmail(value: boolean) {
    setAutoEmail(value);
    try {
      await apiClient.patch("/api/user/settings", { auto_email: value });
    } catch (error) {
      console.error("Failed to update auto-email:", error);
      setAutoEmail(!value);
    }
  }

  async function handleLanguageChange(lang: string) {
    setSelectedLanguage(lang);
    setShowLanguagePicker(false);
    try {
      await apiClient.patch("/api/user/settings", { language: lang });
    } catch (error) {
      console.error("Failed to update language:", error);
    }
  }

  async function handleSignOut() {
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign Out",
        style: "destructive",
        onPress: async () => {
          await supabase.auth.signOut();
        },
      },
    ]);
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#3B82F6" />
      </View>
    );
  }

  const currentLanguageLabel =
    LANGUAGES.find((l) => l.value === selectedLanguage)?.label || "English";

  return (
    <SafeAreaView style={styles.container} edges={["left", "right"]}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Profile</Text>
          <View style={styles.card}>
            <View style={styles.avatarRow}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>
                  {(profile?.full_name || "U").charAt(0).toUpperCase()}
                </Text>
              </View>
              <View style={styles.avatarInfo}>
                <Text style={styles.name}>{profile?.full_name}</Text>
                <Text style={styles.email}>{profile?.email}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Preferences Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Preferences</Text>
          <View style={styles.card}>
            {/* Language */}
            <TouchableOpacity
              style={styles.settingRow}
              onPress={() => setShowLanguagePicker(!showLanguagePicker)}
            >
              <Text style={styles.settingLabel}>Language</Text>
              <Text style={styles.settingValue}>{currentLanguageLabel}</Text>
            </TouchableOpacity>

            {showLanguagePicker && (
              <View style={styles.languagePicker}>
                {LANGUAGES.map((lang) => (
                  <TouchableOpacity
                    key={lang.value}
                    style={[
                      styles.languageOption,
                      selectedLanguage === lang.value &&
                        styles.languageOptionSelected,
                    ]}
                    onPress={() => handleLanguageChange(lang.value)}
                  >
                    <Text
                      style={[
                        styles.languageOptionText,
                        selectedLanguage === lang.value &&
                          styles.languageOptionTextSelected,
                      ]}
                    >
                      {lang.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            <View style={styles.divider} />

            {/* Auto Email */}
            <View style={styles.settingRow}>
              <View style={styles.settingTextGroup}>
                <Text style={styles.settingLabel}>Auto-email summaries</Text>
                <Text style={styles.settingDescription}>
                  Receive summaries by email after each recording
                </Text>
              </View>
              <Switch
                value={autoEmail}
                onValueChange={handleToggleAutoEmail}
                trackColor={{ false: "#E5E7EB", true: "#93C5FD" }}
                thumbColor={autoEmail ? "#3B82F6" : "#F9FAFB"}
              />
            </View>
          </View>
        </View>

        {/* Plan Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Plan</Text>
          <View style={styles.card}>
            <View style={styles.planRow}>
              <View>
                <Text style={styles.planName}>
                  {(profile?.plan || "free").charAt(0).toUpperCase() +
                    (profile?.plan || "free").slice(1)}{" "}
                  Plan
                </Text>
                <Text style={styles.planDescription}>
                  {profile?.plan === "pro"
                    ? "Unlimited recordings and summaries"
                    : "5 recordings per month"}
                </Text>
              </View>
              {profile?.plan !== "pro" && (
                <TouchableOpacity style={styles.upgradeButton}>
                  <Text style={styles.upgradeButtonText}>Upgrade</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>

        {/* Sign Out */}
        <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>

        <Text style={styles.version}>NoteGenius AI v1.0.0</Text>
      </ScrollView>
    </SafeAreaView>
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
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#6B7280",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  card: {
    backgroundColor: "#F9FAFB",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#F3F4F6",
  },
  avatarRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "#3B82F6",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 14,
  },
  avatarText: {
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "700",
  },
  avatarInfo: {
    flex: 1,
  },
  name: {
    fontSize: 17,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 2,
  },
  email: {
    fontSize: 14,
    color: "#6B7280",
  },
  settingRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 4,
  },
  settingTextGroup: {
    flex: 1,
    marginRight: 12,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: "500",
    color: "#111827",
  },
  settingValue: {
    fontSize: 16,
    color: "#3B82F6",
    fontWeight: "500",
  },
  settingDescription: {
    fontSize: 13,
    color: "#6B7280",
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: "#E5E7EB",
    marginVertical: 12,
  },
  languagePicker: {
    marginTop: 8,
    marginBottom: 4,
  },
  languageOption: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginBottom: 4,
  },
  languageOptionSelected: {
    backgroundColor: "#EFF6FF",
  },
  languageOptionText: {
    fontSize: 15,
    color: "#374151",
  },
  languageOptionTextSelected: {
    color: "#3B82F6",
    fontWeight: "600",
  },
  planRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  planName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 2,
  },
  planDescription: {
    fontSize: 13,
    color: "#6B7280",
  },
  upgradeButton: {
    backgroundColor: "#3B82F6",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
  },
  upgradeButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
  },
  signOutButton: {
    backgroundColor: "#FEF2F2",
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 8,
  },
  signOutText: {
    color: "#EF4444",
    fontSize: 16,
    fontWeight: "600",
  },
  version: {
    textAlign: "center",
    color: "#9CA3AF",
    fontSize: 12,
    marginTop: 24,
  },
});
