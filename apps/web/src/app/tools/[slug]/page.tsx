"use client";

import { use, useState, useRef, useCallback, useEffect } from "react";
import Link from "next/link";
import {
  Video,
  FileVideo,
  PlayCircle,
  FileAudio,
  Mic,
  AudioLines,
  Volume2,
  Captions,
  Languages,
  FileText,
  Globe,
  FileVideo2,
  Minimize2,
  FileAudio2,
  Upload,
  Copy,
  Check,
  Download,
  Loader2,
  ArrowLeft,
  Square,
  ChevronDown,
  Menu,
  X,
  Play,
  Pause,
} from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import {
  tools,
  categories,
  getToolBySlug,
  getToolsByCategory,
} from "@/lib/tool-config";
import type { ToolConfig, ToolType } from "@/lib/tool-config";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

/* ───────────────────── icon map ───────────────────── */
const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  Video,
  FileVideo,
  PlayCircle,
  FileAudio,
  Mic,
  AudioLines,
  Volume2,
  Captions,
  Languages,
  FileText,
  Globe,
  FileVideo2,
  Minimize2,
  FileAudio2,
};

/* ───────────────────── languages ───────────────────── */
const LANGUAGES = [
  { code: "", label: "Auto-detect" },
  { code: "en", label: "English" },
  { code: "es", label: "Spanish" },
  { code: "fr", label: "French" },
  { code: "de", label: "German" },
  { code: "it", label: "Italian" },
  { code: "pt", label: "Portuguese" },
  { code: "nl", label: "Dutch" },
  { code: "ru", label: "Russian" },
  { code: "zh", label: "Chinese" },
  { code: "ja", label: "Japanese" },
  { code: "ko", label: "Korean" },
  { code: "ar", label: "Arabic" },
  { code: "hi", label: "Hindi" },
  { code: "tr", label: "Turkish" },
  { code: "pl", label: "Polish" },
  { code: "sv", label: "Swedish" },
  { code: "da", label: "Danish" },
  { code: "fi", label: "Finnish" },
  { code: "no", label: "Norwegian" },
];

const TARGET_LANGUAGES = LANGUAGES.filter((l) => l.code !== "");

/* ───────────────────── header ───────────────────── */
function ToolPageHeader() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100">
      <div className="max-w-7xl mx-auto flex items-center justify-between px-4 py-3">
        <Link href="/" className="flex items-center gap-2 text-xl font-bold">
          <span className="text-2xl">🎙️</span>
          <span>
            NoteGenius <span className="text-[#3B82F6]">AI</span>
          </span>
        </Link>

        <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-gray-600">
          <Link href="/" className="hover:text-gray-900 transition-colors">
            Home
          </Link>
          <DropdownMenu>
            <DropdownMenuTrigger className="flex items-center gap-1 hover:text-gray-900 transition-colors cursor-pointer">
              Tools <ChevronDown className="size-3.5" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" sideOffset={8} className="w-64">
              {categories.map((cat) => (
                <div key={cat.key}>
                  <DropdownMenuLabel>{cat.label}</DropdownMenuLabel>
                  {getToolsByCategory(cat.key).map((tool) => (
                    <DropdownMenuItem key={tool.slug}>
                      <Link
                        href={`/tools/${tool.slug}`}
                        className="w-full text-sm"
                      >
                        {tool.title}
                      </Link>
                    </DropdownMenuItem>
                  ))}
                  <DropdownMenuSeparator />
                </div>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          <Link
            href="/#pricing"
            className="hover:text-gray-900 transition-colors"
          >
            Pricing
          </Link>
        </nav>

        <div className="hidden md:block">
          <Link href="/signup">
            <Button className="bg-[#3B82F6] hover:bg-[#2563EB] text-white rounded-full px-6 h-9 text-sm cursor-pointer">
              Start For Free
            </Button>
          </Link>
        </div>

        <button
          className="md:hidden p-2"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label="Toggle menu"
        >
          {mobileOpen ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>
      </div>

      {mobileOpen && (
        <div className="md:hidden border-t border-gray-100 bg-white px-4 pb-4">
          <nav className="flex flex-col gap-3 py-3 text-sm font-medium text-gray-600">
            <Link href="/" onClick={() => setMobileOpen(false)}>
              Home
            </Link>
            <Link href="/tools" onClick={() => setMobileOpen(false)}>
              All Tools
            </Link>
            <Link href="/#pricing" onClick={() => setMobileOpen(false)}>
              Pricing
            </Link>
          </nav>
          <Link href="/signup">
            <Button className="w-full bg-[#3B82F6] hover:bg-[#2563EB] text-white rounded-full h-9 text-sm cursor-pointer">
              Start For Free
            </Button>
          </Link>
        </div>
      )}
    </header>
  );
}

/* ───────────────────── helpers ───────────────────── */
function formatTimestamp(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${m}:${String(s).padStart(2, "0")}`;
}

interface Segment {
  start: number;
  end: number;
  text: string;
}

function segmentsToSRT(segments: Segment[]): string {
  return segments
    .map((seg, i) => {
      const start = srtTime(seg.start);
      const end = srtTime(seg.end);
      return `${i + 1}\n${start} --> ${end}\n${seg.text.trim()}\n`;
    })
    .join("\n");
}

function srtTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const ms = Math.round((seconds % 1) * 1000);
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")},${String(ms).padStart(3, "0")}`;
}

/* ───────────────────── Upload Area ───────────────────── */
function FileUploadArea({
  tool,
  file,
  onFileSelect,
  disabled,
}: {
  tool: ToolConfig;
  file: File | null;
  onFileSelect: (f: File) => void;
  disabled: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      if (disabled) return;
      const dropped = e.dataTransfer.files[0];
      if (dropped) onFileSelect(dropped);
    },
    [onFileSelect, disabled]
  );

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        if (!disabled) setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}
      onClick={() => !disabled && inputRef.current?.click()}
      className={`relative border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-all ${
        dragOver
          ? "border-[#3B82F6] bg-blue-50"
          : file
            ? "border-green-300 bg-green-50/50"
            : "border-gray-200 hover:border-gray-300 hover:bg-gray-50/50"
      } ${disabled ? "opacity-60 cursor-not-allowed" : ""}`}
    >
      <input
        ref={inputRef}
        type="file"
        accept={tool.acceptedFormats}
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onFileSelect(f);
        }}
        disabled={disabled}
      />
      {file ? (
        <div className="space-y-2">
          <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center mx-auto">
            <Check className="size-6 text-green-600" />
          </div>
          <p className="font-medium text-gray-900">{file.name}</p>
          <p className="text-sm text-gray-500">
            {(file.size / (1024 * 1024)).toFixed(1)} MB
          </p>
          <p className="text-xs text-gray-400">Click or drop to replace</p>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="w-14 h-14 rounded-2xl bg-[#DBEAFE] flex items-center justify-center mx-auto">
            <Upload className="size-6 text-[#3B82F6]" />
          </div>
          <div>
            <p className="font-medium text-gray-900">
              Drag & drop or click to upload
            </p>
            <p className="mt-1 text-sm text-gray-500">
              Supported formats: {tool.acceptLabel}
            </p>
            <p className="text-xs text-gray-400 mt-1">Max file size: 25 MB</p>
          </div>
        </div>
      )}
    </div>
  );
}

/* ───────────────────── YouTube Input ───────────────────── */
function YouTubeInput({
  url,
  onUrlChange,
  disabled,
}: {
  url: string;
  onUrlChange: (u: string) => void;
  disabled: boolean;
}) {
  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700">
        YouTube Video URL
      </label>
      <div className="flex gap-3">
        <input
          type="url"
          value={url}
          onChange={(e) => onUrlChange(e.target.value)}
          placeholder="https://www.youtube.com/watch?v=..."
          disabled={disabled}
          className="flex-1 h-12 px-4 rounded-xl border border-gray-200 text-sm outline-none focus:border-[#3B82F6] focus:ring-2 focus:ring-[#3B82F6]/20 disabled:opacity-60 transition-all"
        />
      </div>
    </div>
  );
}

/* ───────────────────── Text Input ───────────────────── */
function TextInputArea({
  text,
  onTextChange,
  disabled,
  placeholder,
}: {
  text: string;
  onTextChange: (t: string) => void;
  disabled: boolean;
  placeholder: string;
}) {
  return (
    <textarea
      value={text}
      onChange={(e) => onTextChange(e.target.value)}
      placeholder={placeholder}
      disabled={disabled}
      rows={8}
      className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm outline-none focus:border-[#3B82F6] focus:ring-2 focus:ring-[#3B82F6]/20 disabled:opacity-60 transition-all resize-y"
    />
  );
}

/* ───────────────────── Microphone Recorder ───────────────────── */
function MicRecorder({
  onRecordingComplete,
  disabled,
}: {
  onRecordingComplete: (blob: Blob) => void;
  disabled: boolean;
}) {
  const [recording, setRecording] = useState(false);
  const [duration, setDuration] = useState(0);
  const [recorded, setRecorded] = useState(false);
  const mediaRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
          ? "audio/webm;codecs=opus"
          : "audio/webm",
      });
      chunksRef.current = [];
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        onRecordingComplete(blob);
        setRecorded(true);
        stream.getTracks().forEach((t) => t.stop());
      };
      mediaRef.current = mediaRecorder;
      mediaRecorder.start(1000);
      setRecording(true);
      setDuration(0);
      setRecorded(false);
      timerRef.current = setInterval(() => {
        setDuration((d) => d + 1);
      }, 1000);
    } catch {
      alert("Could not access microphone. Please check permissions.");
    }
  };

  const stopRecording = () => {
    mediaRef.current?.stop();
    setRecording(false);
    if (timerRef.current) clearInterval(timerRef.current);
  };

  return (
    <div className="border-2 border-dashed rounded-2xl p-12 text-center border-gray-200">
      <div className="space-y-4">
        {recording ? (
          <>
            <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto animate-pulse">
              <Mic className="size-7 text-red-500" />
            </div>
            <p className="text-lg font-medium text-gray-900">
              Recording... {formatTimestamp(duration)}
            </p>
            <Button
              onClick={stopRecording}
              className="bg-red-500 hover:bg-red-600 text-white rounded-full px-8 h-10 cursor-pointer"
            >
              <Square className="size-4 mr-2" />
              Stop Recording
            </Button>
          </>
        ) : (
          <>
            <div
              className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto ${recorded ? "bg-green-100" : "bg-[#DBEAFE]"}`}
            >
              {recorded ? (
                <Check className="size-7 text-green-600" />
              ) : (
                <Mic className="size-7 text-[#3B82F6]" />
              )}
            </div>
            {recorded ? (
              <p className="text-sm text-green-600 font-medium">
                Recording saved ({formatTimestamp(duration)})
              </p>
            ) : (
              <p className="text-gray-500">
                Click the button below to start recording from your microphone
              </p>
            )}
            <Button
              onClick={startRecording}
              disabled={disabled}
              className="bg-[#3B82F6] hover:bg-[#2563EB] text-white rounded-full px-8 h-10 cursor-pointer"
            >
              <Mic className="size-4 mr-2" />
              {recorded ? "Record Again" : "Start Recording"}
            </Button>
          </>
        )}
      </div>
    </div>
  );
}

/* ───────────────────── Language Selector ───────────────────── */
function LanguageSelector({
  value,
  onChange,
  label,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  label: string;
  options: typeof LANGUAGES;
}) {
  return (
    <div className="space-y-1">
      <label className="block text-sm font-medium text-gray-700">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-10 w-full rounded-lg border border-gray-200 px-3 text-sm outline-none focus:border-[#3B82F6] focus:ring-2 focus:ring-[#3B82F6]/20 bg-white"
      >
        {options.map((l) => (
          <option key={l.code} value={l.code}>
            {l.label}
          </option>
        ))}
      </select>
    </div>
  );
}

/* ───────────────────── Result Display ───────────────────── */
function TranscriptResult({
  segments,
  fullText,
}: {
  segments: Segment[];
  fullText: string;
}) {
  const [copied, setCopied] = useState(false);

  const copyText = () => {
    navigator.clipboard.writeText(fullText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const downloadTxt = () => {
    const blob = new Blob([fullText], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "transcript.txt";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
      <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
        <h3 className="font-semibold text-gray-900">Transcript</h3>
        <div className="flex items-center gap-2">
          <button
            onClick={copyText}
            className="flex items-center gap-1.5 text-xs font-medium text-gray-500 hover:text-gray-900 transition-colors px-2 py-1 rounded-md hover:bg-gray-100"
          >
            {copied ? (
              <Check className="size-3.5 text-green-500" />
            ) : (
              <Copy className="size-3.5" />
            )}
            {copied ? "Copied" : "Copy"}
          </button>
          <button
            onClick={downloadTxt}
            className="flex items-center gap-1.5 text-xs font-medium text-gray-500 hover:text-gray-900 transition-colors px-2 py-1 rounded-md hover:bg-gray-100"
          >
            <Download className="size-3.5" />
            Download TXT
          </button>
        </div>
      </div>
      <div className="p-5 max-h-[500px] overflow-y-auto space-y-3">
        {segments.length > 0
          ? segments.map((seg, i) => (
              <div key={i} className="flex gap-3">
                <span className="text-xs font-mono text-[#3B82F6] mt-0.5 shrink-0 w-12 text-right">
                  {formatTimestamp(seg.start)}
                </span>
                <p className="text-sm text-gray-700 leading-relaxed">
                  {seg.text}
                </p>
              </div>
            ))
          : fullText && (
              <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
                {fullText}
              </p>
            )}
      </div>
    </div>
  );
}

function SummaryResult({
  summary,
}: {
  summary: {
    overview: string;
    action_items: string[];
    key_decisions: string[];
    topics: string[];
    sentiment: string;
  };
}) {
  const [copied, setCopied] = useState(false);

  const fullText = [
    `Overview: ${summary.overview}`,
    "",
    `Key Points: ${summary.topics.join(", ")}`,
    "",
    `Decisions: ${summary.key_decisions.join("\n- ")}`,
    "",
    `Action Items: ${summary.action_items.join("\n- ")}`,
    "",
    `Sentiment: ${summary.sentiment}`,
  ].join("\n");

  const copyText = () => {
    navigator.clipboard.writeText(fullText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
      <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
        <h3 className="font-semibold text-gray-900">Summary</h3>
        <button
          onClick={copyText}
          className="flex items-center gap-1.5 text-xs font-medium text-gray-500 hover:text-gray-900 transition-colors px-2 py-1 rounded-md hover:bg-gray-100"
        >
          {copied ? (
            <Check className="size-3.5 text-green-500" />
          ) : (
            <Copy className="size-3.5" />
          )}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <div className="p-5 space-y-5">
        <div>
          <h4 className="text-sm font-semibold text-gray-900 mb-1">Overview</h4>
          <p className="text-sm text-gray-600 leading-relaxed">
            {summary.overview}
          </p>
        </div>
        {summary.topics.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold text-gray-900 mb-2">
              Topics Discussed
            </h4>
            <div className="flex flex-wrap gap-2">
              {summary.topics.map((t, i) => (
                <span
                  key={i}
                  className="text-xs bg-blue-50 text-blue-700 px-2.5 py-1 rounded-full"
                >
                  {t}
                </span>
              ))}
            </div>
          </div>
        )}
        {summary.key_decisions.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold text-gray-900 mb-2">
              Key Decisions
            </h4>
            <ul className="space-y-1.5">
              {summary.key_decisions.map((d, i) => (
                <li
                  key={i}
                  className="flex items-start gap-2 text-sm text-gray-600"
                >
                  <Check className="size-4 text-green-500 mt-0.5 shrink-0" />
                  {d}
                </li>
              ))}
            </ul>
          </div>
        )}
        {summary.action_items.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold text-gray-900 mb-2">
              Action Items
            </h4>
            <ul className="space-y-1.5">
              {summary.action_items.map((a, i) => (
                <li
                  key={i}
                  className="flex items-start gap-2 text-sm text-gray-600"
                >
                  <div className="w-4 h-4 rounded border border-gray-300 mt-0.5 shrink-0" />
                  {a}
                </li>
              ))}
            </ul>
          </div>
        )}
        <div className="flex items-center gap-2 text-xs text-gray-400">
          <span>Sentiment:</span>
          <span className="capitalize font-medium text-gray-600">
            {summary.sentiment}
          </span>
        </div>
      </div>
    </div>
  );
}

function SRTResult({ segments }: { segments: Segment[] }) {
  const srt = segmentsToSRT(segments);

  const downloadSRT = () => {
    const blob = new Blob([srt], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "subtitles.srt";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
      <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
        <h3 className="font-semibold text-gray-900">Generated Subtitles</h3>
        <button
          onClick={downloadSRT}
          className="flex items-center gap-1.5 text-sm font-medium text-[#3B82F6] hover:text-[#2563EB] transition-colors px-3 py-1.5 rounded-md hover:bg-blue-50"
        >
          <Download className="size-4" />
          Download SRT
        </button>
      </div>
      <div className="p-5 max-h-[400px] overflow-y-auto">
        <pre className="text-xs text-gray-600 font-mono whitespace-pre-wrap leading-relaxed">
          {srt}
        </pre>
      </div>
    </div>
  );
}

/* ───────────────────── Text-to-Speech Player ───────────────────── */
function TTSPlayer({ text }: { text: string }) {
  const [speaking, setSpeaking] = useState(false);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoice, setSelectedVoice] = useState("");

  useEffect(() => {
    const loadVoices = () => {
      const v = speechSynthesis.getVoices();
      setVoices(v);
      if (v.length > 0 && !selectedVoice) {
        const defaultVoice = v.find((voice) => voice.default) || v[0];
        setSelectedVoice(defaultVoice.name);
      }
    };
    loadVoices();
    speechSynthesis.onvoiceschanged = loadVoices;
  }, [selectedVoice]);

  const speak = () => {
    if (speaking) {
      speechSynthesis.cancel();
      setSpeaking(false);
      return;
    }
    const utterance = new SpeechSynthesisUtterance(text);
    const voice = voices.find((v) => v.name === selectedVoice);
    if (voice) utterance.voice = voice;
    utterance.onend = () => setSpeaking(false);
    utterance.onerror = () => setSpeaking(false);
    speechSynthesis.speak(utterance);
    setSpeaking(true);
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
      <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
        <h3 className="font-semibold text-gray-900">Audio Output</h3>
      </div>
      <div className="p-5 space-y-4">
        <div className="space-y-1">
          <label className="block text-sm font-medium text-gray-700">
            Voice
          </label>
          <select
            value={selectedVoice}
            onChange={(e) => setSelectedVoice(e.target.value)}
            className="h-10 w-full rounded-lg border border-gray-200 px-3 text-sm outline-none focus:border-[#3B82F6] bg-white"
          >
            {voices.map((v) => (
              <option key={v.name} value={v.name}>
                {v.name} ({v.lang})
              </option>
            ))}
          </select>
        </div>
        <Button
          onClick={speak}
          className="bg-[#3B82F6] hover:bg-[#2563EB] text-white rounded-full px-8 h-10 cursor-pointer"
        >
          {speaking ? (
            <>
              <Pause className="size-4 mr-2" />
              Stop
            </>
          ) : (
            <>
              <Play className="size-4 mr-2" />
              Play Audio
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

/* ───────────────────── Converter / Compressor ───────────────────── */
function ConverterTool({ tool }: { tool: ToolConfig }) {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");
  const [result, setResult] = useState<{ url: string; name: string; originalSize: number; newSize: number; savings: number } | null>(null);
  const isCompressor = tool.slug.includes("compressor");
  const isVideo = tool.slug.includes("video");
  const [targetFormat, setTargetFormat] = useState(isVideo ? "mp4" : "mp3");
  const [quality, setQuality] = useState<"low" | "medium" | "high">("medium");

  const videoFormats = ["mp4", "avi", "mov", "webm"];
  const audioFormats = ["mp3", "wav", "ogg", "m4a", "aac", "flac"];
  const formats = isVideo ? videoFormats : audioFormats;

  async function handleProcess() {
    if (!file) return;
    setLoading(true);
    setError("");
    setResult(null);
    setProgress(0);

    try {
      const { convertFile, compressFile } = await import("@/lib/ffmpeg-client");

      if (isCompressor) {
        const res = await compressFile(file, isVideo ? "video" : "audio", quality, setProgress);
        const url = URL.createObjectURL(res.blob);
        setResult({ url, name: `compressed-${file.name}`, originalSize: res.originalSize, newSize: res.compressedSize, savings: res.savings });
      } else {
        const blob = await convertFile(file, targetFormat as any, setProgress);
        const url = URL.createObjectURL(blob);
        const name = file.name.replace(/\.[^.]+$/, `.${targetFormat}`);
        setResult({ url, name, originalSize: file.size, newSize: blob.size, savings: Math.round((1 - blob.size / file.size) * 100) });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Processing failed");
    } finally {
      setLoading(false);
    }
  }

  function formatSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  return (
    <div className="space-y-6">
      <FileUploadArea tool={tool} file={file} onFileSelect={setFile} disabled={loading} />

      {file && (
        <div className="bg-white rounded-xl border p-4 space-y-4">
          <p className="text-sm text-gray-600">File: <span className="font-medium text-gray-900">{file.name}</span> ({formatSize(file.size)})</p>

          {!isCompressor && (
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-2">Convert to:</label>
              <div className="flex flex-wrap gap-2">
                {formats.map((fmt) => (
                  <button key={fmt} onClick={() => setTargetFormat(fmt)} className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-colors cursor-pointer ${targetFormat === fmt ? "bg-[#3B82F6] text-white border-[#3B82F6]" : "bg-white text-gray-600 border-gray-200 hover:border-[#3B82F6]"}`}>
                    .{fmt.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>
          )}

          {isCompressor && (
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-2">Quality:</label>
              <div className="flex gap-2">
                {(["low", "medium", "high"] as const).map((q) => (
                  <button key={q} onClick={() => setQuality(q)} className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-colors cursor-pointer capitalize ${quality === q ? "bg-[#3B82F6] text-white border-[#3B82F6]" : "bg-white text-gray-600 border-gray-200 hover:border-[#3B82F6]"}`}>
                    {q} {q === "low" ? "(smallest file)" : q === "high" ? "(best quality)" : ""}
                  </button>
                ))}
              </div>
            </div>
          )}

          <Button onClick={handleProcess} disabled={loading} className="bg-[#3B82F6] hover:bg-[#2563EB] text-white rounded-full px-8 h-10 cursor-pointer">
            {loading ? `Processing... ${progress}%` : tool.buttonLabel || "Process"}
          </Button>
        </div>
      )}

      {error && <div className="bg-red-50 text-red-700 rounded-xl p-4 text-sm">{error}</div>}

      {result && (
        <div className="bg-green-50 rounded-xl border border-green-200 p-6 space-y-3">
          <h3 className="font-semibold text-green-900">Done!</h3>
          <div className="flex gap-6 text-sm">
            <div><span className="text-gray-500">Original:</span> <span className="font-medium">{formatSize(result.originalSize)}</span></div>
            <div><span className="text-gray-500">New:</span> <span className="font-medium">{formatSize(result.newSize)}</span></div>
            {result.savings > 0 && <div><span className="text-gray-500">Saved:</span> <span className="font-medium text-green-700">{result.savings}%</span></div>}
          </div>
          <a href={result.url} download={result.name}>
            <Button className="bg-green-600 hover:bg-green-700 text-white rounded-full px-8 h-10 cursor-pointer mt-2">
              Download {result.name}
            </Button>
          </a>
        </div>
      )}

      {loading && (
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div className="bg-[#3B82F6] h-2 rounded-full transition-all" style={{ width: `${progress}%` }} />
        </div>
      )}
    </div>
  );
}

/* ───────────────────── TOOL PAGE BODY ───────────────────── */
function ToolPageBody({ tool }: { tool: ToolConfig }) {
  const [file, setFile] = useState<File | null>(null);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [textInput, setTextInput] = useState("");
  const [language, setLanguage] = useState("");
  const [targetLang, setTargetLang] = useState("en");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [segments, setSegments] = useState<Segment[]>([]);
  const [fullText, setFullText] = useState("");
  const [summary, setSummary] = useState<{
    overview: string;
    action_items: string[];
    key_decisions: string[];
    topics: string[];
    sentiment: string;
  } | null>(null);
  const [ttsReady, setTtsReady] = useState(false);

  const Icon = iconMap[tool.icon] || Video;

  const hasInput = () => {
    switch (tool.type) {
      case "upload-transcribe":
      case "upload-summarize":
      case "upload-subtitle":
      case "upload-translate":
        return !!file;
      case "youtube-input":
      case "youtube-summarize":
        return !!youtubeUrl.trim();
      case "record-transcribe":
        return !!recordedBlob;
      case "text-input":
        return !!textInput.trim();
      case "converter":
        return !!file;
      default:
        return false;
    }
  };

  const handleProcess = async () => {
    setLoading(true);
    setError("");
    setSegments([]);
    setFullText("");
    setSummary(null);
    setTtsReady(false);

    try {
      switch (tool.type) {
        case "upload-transcribe": {
          if (!file) return;
          const formData = new FormData();
          formData.append("file", file);
          if (language) formData.append("language", language);
          const res = await fetch("/api/tools/transcribe", {
            method: "POST",
            body: formData,
          });
          if (!res.ok) {
            const body = await res.json().catch(() => ({}));
            throw new Error(body.error || `Request failed (${res.status})`);
          }
          const data = await res.json();
          setSegments(data.segments || []);
          setFullText(data.text || "");
          break;
        }

        case "upload-summarize": {
          if (!file) return;
          const formData = new FormData();
          formData.append("file", file);
          if (language) formData.append("language", language);
          const res = await fetch("/api/tools/summarize", {
            method: "POST",
            body: formData,
          });
          if (!res.ok) {
            const body = await res.json().catch(() => ({}));
            throw new Error(body.error || `Request failed (${res.status})`);
          }
          const data = await res.json();
          setSegments(data.segments || []);
          setFullText(data.text || "");
          setSummary(data.summary);
          break;
        }

        case "youtube-input": {
          const res = await fetch("/api/tools/youtube", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ url: youtubeUrl }),
          });
          if (!res.ok) {
            const body = await res.json().catch(() => ({}));
            throw new Error(body.error || `Request failed (${res.status})`);
          }
          const data = await res.json();
          setSegments(data.segments || []);
          setFullText(data.text || "");
          break;
        }

        case "youtube-summarize": {
          const res = await fetch("/api/tools/youtube", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ url: youtubeUrl, summarize: true }),
          });
          if (!res.ok) {
            const body = await res.json().catch(() => ({}));
            throw new Error(body.error || `Request failed (${res.status})`);
          }
          const data = await res.json();
          setSegments(data.segments || []);
          setFullText(data.text || "");
          if (data.summary) setSummary(data.summary);
          break;
        }

        case "record-transcribe": {
          if (!recordedBlob) return;
          const formData = new FormData();
          formData.append("file", recordedBlob, "recording.webm");
          if (language) formData.append("language", language);
          const res = await fetch("/api/tools/transcribe", {
            method: "POST",
            body: formData,
          });
          if (!res.ok) {
            const body = await res.json().catch(() => ({}));
            throw new Error(body.error || `Request failed (${res.status})`);
          }
          const data = await res.json();
          setSegments(data.segments || []);
          setFullText(data.text || "");
          break;
        }

        case "text-input": {
          if (tool.slug === "text-to-speech") {
            setTtsReady(true);
          } else if (tool.slug === "pdf-translator") {
            const res = await fetch("/api/tools/translate", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                text: textInput,
                targetLanguage: targetLang,
              }),
            });
            if (!res.ok) {
              const body = await res.json().catch(() => ({}));
              throw new Error(body.error || `Request failed (${res.status})`);
            }
            const data = await res.json();
            setFullText(data.translatedText || "");
          }
          break;
        }

        case "upload-subtitle": {
          if (!file) return;
          const formData = new FormData();
          formData.append("file", file);
          if (language) formData.append("language", language);
          const res = await fetch("/api/tools/transcribe", {
            method: "POST",
            body: formData,
          });
          if (!res.ok) {
            const body = await res.json().catch(() => ({}));
            throw new Error(body.error || `Request failed (${res.status})`);
          }
          const data = await res.json();
          setSegments(data.segments || []);
          setFullText(data.text || "");
          break;
        }

        case "upload-translate": {
          if (!file) return;
          const formData = new FormData();
          formData.append("file", file);
          formData.append("translate", "true");
          if (language) formData.append("language", language);
          const res = await fetch("/api/tools/transcribe", {
            method: "POST",
            body: formData,
          });
          if (!res.ok) {
            const body = await res.json().catch(() => ({}));
            throw new Error(body.error || `Request failed (${res.status})`);
          }
          const data = await res.json();
          setSegments(data.segments || []);
          setFullText(data.text || "");
          break;
        }

        default:
          break;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  // Determine which input to show
  const showsFileUpload = [
    "upload-transcribe",
    "upload-summarize",
    "upload-subtitle",
    "upload-translate",
  ].includes(tool.type);
  const showsYouTube = ["youtube-input", "youtube-summarize"].includes(
    tool.type
  );
  const showsTextInput = tool.type === "text-input";
  const showsRecorder = tool.type === "record-transcribe";
  const showsLanguageSelector = [
    "upload-transcribe",
    "upload-summarize",
    "upload-subtitle",
    "upload-translate",
    "record-transcribe",
  ].includes(tool.type);
  const showsTargetLang =
    tool.slug === "pdf-translator" || tool.type === "upload-translate";
  const isConverter = tool.type === "converter";

  const hasResults = segments.length > 0 || !!fullText || !!summary || ttsReady;

  return (
    <div className="min-h-screen bg-[#FAFBFC]">
      <ToolPageHeader />

      {/* Breadcrumb */}
      <div className="max-w-4xl mx-auto px-4 py-4">
        <Link
          href="/tools"
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 transition-colors"
        >
          <ArrowLeft className="size-3.5" />
          All Tools
        </Link>
      </div>

      {/* Tool Header */}
      <section className="max-w-4xl mx-auto px-4 pb-8">
        <motion.div
          initial={{ opacity: 1, y: 0 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <div className="flex items-start gap-4 mb-2">
            <div className="w-12 h-12 rounded-xl bg-[#DBEAFE] flex items-center justify-center shrink-0">
              <Icon className="size-6 text-[#3B82F6]" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
                {tool.title}
              </h1>
              <p className="mt-1 text-gray-500">{tool.description}</p>
            </div>
          </div>
        </motion.div>
      </section>

      {/* Main Content */}
      <section className="max-w-4xl mx-auto px-4 pb-16 space-y-6">
        <motion.div
          initial={{ opacity: 1, y: 0 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="space-y-6"
        >
          {/* Converter / compressor tools */}
          {isConverter ? (
            <ConverterTool tool={tool} />
          ) : (
            <>
              {/* Input area */}
              {showsFileUpload && (
                <FileUploadArea
                  tool={tool}
                  file={file}
                  onFileSelect={setFile}
                  disabled={loading}
                />
              )}

              {showsYouTube && (
                <YouTubeInput
                  url={youtubeUrl}
                  onUrlChange={setYoutubeUrl}
                  disabled={loading}
                />
              )}

              {showsRecorder && (
                <MicRecorder
                  onRecordingComplete={setRecordedBlob}
                  disabled={loading}
                />
              )}

              {showsTextInput && (
                <TextInputArea
                  text={textInput}
                  onTextChange={setTextInput}
                  disabled={loading}
                  placeholder={
                    tool.slug === "text-to-speech"
                      ? "Enter the text you want to convert to speech..."
                      : "Paste the text you want to translate..."
                  }
                />
              )}

              {/* Options row */}
              <div className="flex flex-wrap gap-4">
                {showsLanguageSelector && (
                  <div className="w-48">
                    <LanguageSelector
                      value={language}
                      onChange={setLanguage}
                      label="Source Language"
                      options={LANGUAGES}
                    />
                  </div>
                )}
                {showsTargetLang && (
                  <div className="w-48">
                    <LanguageSelector
                      value={targetLang}
                      onChange={setTargetLang}
                      label="Target Language"
                      options={TARGET_LANGUAGES}
                    />
                  </div>
                )}
              </div>

              {/* Process button */}
              <Button
                onClick={handleProcess}
                disabled={loading || !hasInput()}
                className="bg-[#3B82F6] hover:bg-[#2563EB] text-white rounded-full px-10 h-12 text-base cursor-pointer disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <Loader2 className="size-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  tool.buttonLabel || "Process"
                )}
              </Button>

              {/* Error */}
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-xl px-5 py-4 text-sm text-red-700">
                  {error}
                </div>
              )}

              {/* Results */}
              {hasResults && (
                <motion.div
                  initial={{ opacity: 1, y: 0 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                  className="space-y-6"
                >
                  {/* Summary (if available) */}
                  {summary && <SummaryResult summary={summary} />}

                  {/* SRT for subtitle tool */}
                  {tool.type === "upload-subtitle" && segments.length > 0 && (
                    <SRTResult segments={segments} />
                  )}

                  {/* Transcript (show for non-subtitle tools) */}
                  {tool.type !== "upload-subtitle" &&
                    (segments.length > 0 || fullText) && (
                      <TranscriptResult
                        segments={segments}
                        fullText={fullText}
                      />
                    )}

                  {/* TTS Player */}
                  {ttsReady && <TTSPlayer text={textInput} />}
                </motion.div>
              )}
            </>
          )}
        </motion.div>

        {/* CTA Banner */}
        <motion.div
          initial={{ opacity: 1, y: 0 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.3 }}
          className="mt-16 bg-gradient-to-r from-[#EFF6FF] to-[#DBEAFE] rounded-2xl p-8 text-center"
        >
          <h3 className="text-xl font-bold text-gray-900">
            Want unlimited access?
          </h3>
          <p className="mt-2 text-gray-600">
            Sign up for free and unlock unlimited transcriptions, summaries, and
            more.
          </p>
          <Link href="/signup">
            <Button className="mt-4 bg-[#3B82F6] hover:bg-[#2563EB] text-white rounded-full px-8 h-10 cursor-pointer">
              Sign Up Free
            </Button>
          </Link>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-12 px-4">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-lg font-bold text-white">
            <span className="text-xl">🎙️</span>
            <span>
              NoteGenius <span className="text-[#3B82F6]">AI</span>
            </span>
          </div>
          <p className="text-sm">
            &copy; {new Date().getFullYear()} NoteGenius AI. All rights
            reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}

/* ───────────────────── NOT FOUND ───────────────────── */
function ToolNotFound() {
  return (
    <div className="min-h-screen bg-[#FAFBFC]">
      <ToolPageHeader />
      <div className="max-w-4xl mx-auto px-4 py-20 text-center">
        <h1 className="text-3xl font-bold text-gray-900">Tool Not Found</h1>
        <p className="mt-3 text-gray-500">
          The tool you are looking for does not exist.
        </p>
        <Link href="/tools">
          <Button className="mt-6 bg-[#3B82F6] hover:bg-[#2563EB] text-white rounded-full px-8 h-10 cursor-pointer">
            Browse All Tools
          </Button>
        </Link>
      </div>
    </div>
  );
}

/* ───────────────────── PAGE COMPONENT ───────────────────── */
export default function ToolPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = use(params);
  const tool = getToolBySlug(slug);

  if (!tool) {
    return <ToolNotFound />;
  }

  return <ToolPageBody tool={tool} />;
}
