export type ToolType =
  | "upload-transcribe"
  | "upload-summarize"
  | "youtube-input"
  | "youtube-summarize"
  | "record-transcribe"
  | "text-input"
  | "upload-subtitle"
  | "upload-translate"
  | "converter";

export type ToolCategory = "video" | "audio" | "subtitles" | "converters";

export interface ToolConfig {
  slug: string;
  title: string;
  description: string;
  category: ToolCategory;
  icon: string;
  type: ToolType;
  acceptedFormats?: string;
  acceptLabel?: string;
  buttonLabel?: string;
  comingSoon?: boolean;
}

export const tools: ToolConfig[] = [
  // ── Video ──────────────────────────────────────────────
  {
    slug: "video-to-text",
    title: "Transcribe Video to Text",
    description:
      "Convert MP4, AVI, WebM or MOV video files to accurate text transcripts powered by AI.",
    category: "video",
    icon: "Video",
    type: "upload-transcribe",
    acceptedFormats: ".mp4,.avi,.mov,.webm",
    acceptLabel: "MP4, AVI, MOV, WebM",
    buttonLabel: "Transcribe",
  },
  {
    slug: "video-summarizer",
    title: "Video Summarizer",
    description:
      "Upload a video and get an AI-generated summary with key points, decisions, and action items.",
    category: "video",
    icon: "FileVideo",
    type: "upload-summarize",
    acceptedFormats: ".mp4,.avi,.mov,.webm",
    acceptLabel: "MP4, AVI, MOV, WebM",
    buttonLabel: "Summarize",
  },
  {
    slug: "youtube-transcription",
    title: "YouTube Transcription",
    description:
      "Paste a YouTube URL and get the full transcript of the video instantly.",
    category: "video",
    icon: "PlayCircle",
    type: "youtube-input",
    buttonLabel: "Transcribe",
  },
  {
    slug: "youtube-summarizer",
    title: "YouTube Video Summarizer",
    description:
      "Paste a YouTube URL and get an AI-powered summary of the video content.",
    category: "video",
    icon: "PlayCircle",
    type: "youtube-summarize",
    buttonLabel: "Summarize",
  },

  // ── Audio ──────────────────────────────────────────────
  {
    slug: "audio-to-text",
    title: "Transcribe Audio to Text",
    description:
      "Upload MP3, WAV or M4A audio files and get accurate AI transcriptions with timestamps.",
    category: "audio",
    icon: "FileAudio",
    type: "upload-transcribe",
    acceptedFormats: ".mp3,.wav,.m4a,.ogg,.flac,.webm",
    acceptLabel: "MP3, WAV, M4A, OGG, FLAC",
    buttonLabel: "Transcribe",
  },
  {
    slug: "voice-to-text",
    title: "Voice to Text",
    description:
      "Record directly from your microphone and convert your voice to text in real time.",
    category: "audio",
    icon: "Mic",
    type: "record-transcribe",
    buttonLabel: "Transcribe Recording",
  },
  {
    slug: "speech-to-text",
    title: "Speech to Text",
    description:
      "Upload an audio file or record from your microphone to convert speech into accurate text.",
    category: "audio",
    icon: "AudioLines",
    type: "upload-transcribe",
    acceptedFormats: ".mp3,.wav,.m4a,.ogg,.flac,.webm",
    acceptLabel: "MP3, WAV, M4A, OGG, FLAC",
    buttonLabel: "Transcribe",
  },
  {
    slug: "text-to-speech",
    title: "Text to Speech",
    description:
      "Enter text and listen to it spoken aloud using natural-sounding AI voices.",
    category: "audio",
    icon: "Volume2",
    type: "text-input",
    buttonLabel: "Generate Speech",
  },

  // ── Subtitles & Translators ────────────────────────────
  {
    slug: "add-subtitles",
    title: "Add Subtitles to Video",
    description:
      "Upload a video file and generate downloadable SRT subtitle files automatically.",
    category: "subtitles",
    icon: "Captions",
    type: "upload-subtitle",
    acceptedFormats: ".mp4,.avi,.mov,.webm",
    acceptLabel: "MP4, AVI, MOV, WebM",
    buttonLabel: "Generate Subtitles",
  },
  {
    slug: "translate-audio",
    title: "Translate Audio to Text",
    description:
      "Upload audio in any language and get an English translation of the spoken content.",
    category: "subtitles",
    icon: "Languages",
    type: "upload-translate",
    acceptedFormats: ".mp3,.wav,.m4a,.ogg,.flac,.webm",
    acceptLabel: "MP3, WAV, M4A, OGG, FLAC",
    buttonLabel: "Translate",
  },
  {
    slug: "pdf-translator",
    title: "PDF Translator",
    description:
      "Upload a PDF document and translate its contents into your chosen language with AI.",
    category: "subtitles",
    icon: "FileText",
    type: "text-input",
    buttonLabel: "Translate",
  },
  {
    slug: "translate-video",
    title: "Translate Video to Text",
    description:
      "Upload a video in any language and get an English translation of the spoken content.",
    category: "subtitles",
    icon: "Globe",
    type: "upload-translate",
    acceptedFormats: ".mp4,.avi,.mov,.webm",
    acceptLabel: "MP4, AVI, MOV, WebM",
    buttonLabel: "Translate",
  },

  // ── Converters & Compressors ───────────────────────────
  {
    slug: "video-converter",
    title: "Online Video Converter",
    description:
      "Convert videos between formats including MP4, AVI, MOV, and WebM.",
    category: "converters",
    icon: "FileVideo2",
    type: "converter",
    acceptedFormats: ".mp4,.avi,.mov,.webm,.mkv",
    acceptLabel: "MP4, AVI, MOV, WebM, MKV",
    buttonLabel: "Convert",
    comingSoon: false,
  },
  {
    slug: "video-compressor",
    title: "Video Compressor",
    description:
      "Reduce video file size while maintaining quality. Perfect for sharing and uploading.",
    category: "converters",
    icon: "Minimize2",
    type: "converter",
    acceptedFormats: ".mp4,.avi,.mov,.webm",
    acceptLabel: "MP4, AVI, MOV, WebM",
    buttonLabel: "Compress",
    comingSoon: false,
  },
  {
    slug: "audio-converter",
    title: "Online Audio Converter",
    description:
      "Convert audio files between MP3, WAV, M4A, OGG, and other formats.",
    category: "converters",
    icon: "FileAudio2",
    type: "converter",
    acceptedFormats: ".mp3,.wav,.m4a,.ogg,.flac,.aac",
    acceptLabel: "MP3, WAV, M4A, OGG, FLAC, AAC",
    buttonLabel: "Convert",
    comingSoon: false,
  },
  {
    slug: "audio-compressor",
    title: "Audio Compressor",
    description:
      "Reduce audio file size while preserving quality. Ideal for podcasts and music.",
    category: "converters",
    icon: "Minimize2",
    type: "converter",
    acceptedFormats: ".mp3,.wav,.m4a,.ogg,.flac",
    acceptLabel: "MP3, WAV, M4A, OGG, FLAC",
    buttonLabel: "Compress",
    comingSoon: false,
  },
];

export const categories: {
  key: ToolCategory;
  label: string;
  color: string;
}[] = [
  { key: "video", label: "Video", color: "bg-blue-50 text-blue-600" },
  { key: "audio", label: "Audio", color: "bg-purple-50 text-purple-600" },
  {
    key: "subtitles",
    label: "Subtitles & Translators",
    color: "bg-amber-50 text-amber-600",
  },
  {
    key: "converters",
    label: "Converters & Compressors",
    color: "bg-green-50 text-green-600",
  },
];

export function getToolBySlug(slug: string): ToolConfig | undefined {
  return tools.find((t) => t.slug === slug);
}

export function getToolsByCategory(category: ToolCategory): ToolConfig[] {
  return tools.filter((t) => t.category === category);
}
