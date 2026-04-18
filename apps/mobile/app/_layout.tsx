import { useEffect } from "react";
import { Stack, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as Notifications from "expo-notifications";
import { useCallDetection } from "../hooks/use-call-detection";
import { supabase } from "../lib/supabase";
import { useState } from "react";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export default function RootLayout() {
  const router = useRouter();
  const [callDetectionEnabled, setCallDetectionEnabled] = useState(false);
  const [promptForNotes, setPromptForNotes] = useState(true);
  const [autoRecordAndroid, setAutoRecordAndroid] = useState(false);

  // Load user prefs from profile
  useEffect(() => {
    let mounted = true;
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from("profiles")
        .select("call_detection_enabled, prompt_for_notes_after_call, auto_record_android_calls")
        .eq("id", user.id)
        .single();

      if (mounted && profile) {
        setCallDetectionEnabled(!!profile.call_detection_enabled);
        setPromptForNotes(profile.prompt_for_notes_after_call !== false);
        setAutoRecordAndroid(!!profile.auto_record_android_calls);
      }
    })();

    // Subscribe to profile changes (settings toggle updates)
    const sub = supabase
      .channel("profile_changes")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "profiles" },
        (payload) => {
          if (!mounted) return;
          const p = payload.new as Record<string, unknown>;
          if ("call_detection_enabled" in p)
            setCallDetectionEnabled(!!p.call_detection_enabled);
          if ("prompt_for_notes_after_call" in p)
            setPromptForNotes(p.prompt_for_notes_after_call !== false);
          if ("auto_record_android_calls" in p)
            setAutoRecordAndroid(!!p.auto_record_android_calls);
        }
      )
      .subscribe();

    return () => {
      mounted = false;
      supabase.removeChannel(sub);
    };
  }, []);

  // Activate call detection
  useCallDetection({
    enabled: callDetectionEnabled,
    promptForNotes,
    autoRecordAndroid,
  });

  // Handle notification taps — open post-call screen
  useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data as {
        phoneCallId?: string;
        type?: string;
      };
      if (data?.type === "post_call_notes" && data.phoneCallId) {
        router.push(`/post-call/${data.phoneCallId}`);
      }
    });
    return () => sub.remove();
  }, [router]);

  return (
    <>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="recording/[id]" options={{ headerShown: true, title: "Recording" }} />
        <Stack.Screen
          name="post-call/[id]"
          options={{
            headerShown: false,
            presentation: "modal",
            animation: "slide_from_bottom",
          }}
        />
      </Stack>
    </>
  );
}
