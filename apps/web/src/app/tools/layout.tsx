import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Free AI-Powered Tools — NoteGenius AI",
  description:
    "Free online tools for video transcription, audio-to-text, subtitles, translation, and media conversion. Powered by AI.",
};

export default function ToolsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
