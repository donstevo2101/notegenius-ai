"use client";

import { useState, useRef, useEffect } from "react";
import { Send, Bot, User, Loader2, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { seekAudio } from "./audio-player";

export interface QAMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  created_at: string;
}

interface QAChatProps {
  recordingId: string;
  initialMessages: QAMessage[];
}

/** Parse timestamp references like [12:34] in assistant messages */
function parseTimestampRefs(text: string): React.ReactNode[] {
  const regex = /\[(\d{1,2}:\d{2}(?::\d{2})?)\]/g;
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    // Text before match
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }

    const timestamp = match[1];
    // Parse to seconds
    const segments = timestamp.split(":").map(Number);
    let seconds = 0;
    if (segments.length === 3) {
      seconds = segments[0] * 3600 + segments[1] * 60 + segments[2];
    } else {
      seconds = segments[0] * 60 + segments[1];
    }

    parts.push(
      <button
        key={match.index}
        onClick={() => seekAudio(seconds)}
        className="inline font-mono text-blue-500 hover:text-blue-700 hover:underline"
      >
        [{timestamp}]
      </button>
    );

    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts;
}

export function QAChat({ recordingId, initialMessages }: QAChatProps) {
  const [messages, setMessages] = useState<QAMessage[]>(initialMessages);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  const handleSend = async () => {
    const question = input.trim();
    if (!question || isLoading) return;

    const userMessage: QAMessage = {
      id: `temp-${Date.now()}`,
      role: "user",
      content: question,
      created_at: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const res = await fetch(`/api/recordings/${recordingId}/qa`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question }),
      });

      if (!res.ok) throw new Error("Failed to get response");

      const data = await res.json();
      const assistantMessage: QAMessage = {
        id: data.id || `resp-${Date.now()}`,
        role: "assistant",
        content: data.answer || data.content || "I could not generate a response.",
        created_at: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch {
      const errorMessage: QAMessage = {
        id: `err-${Date.now()}`,
        role: "assistant",
        content: "Sorry, something went wrong. Please try again.",
        created_at: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex h-full flex-col">
      {/* Messages */}
      <ScrollArea className="flex-1 overflow-auto">
        <div ref={scrollRef} className="space-y-3 p-1 pb-4">
          {messages.length === 0 && !isLoading && (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-blue-50">
                <MessageCircle className="h-5 w-5 text-blue-400" />
              </div>
              <p className="text-sm font-medium text-gray-700">
                Ask anything about this recording...
              </p>
              <p className="mt-1 text-xs text-gray-400">
                Get answers based on the transcript and summary
              </p>
            </div>
          )}

          {messages.map((msg) => (
            <div
              key={msg.id}
              className={cn(
                "flex gap-2",
                msg.role === "user" ? "justify-end" : "justify-start"
              )}
            >
              {msg.role === "assistant" && (
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gray-100">
                  <Bot className="h-3.5 w-3.5 text-gray-500" />
                </div>
              )}

              <div
                className={cn(
                  "max-w-[85%] rounded-xl px-3.5 py-2.5 text-sm leading-relaxed",
                  msg.role === "user"
                    ? "bg-blue-500 text-white"
                    : "bg-gray-100 text-gray-700"
                )}
              >
                {msg.role === "assistant"
                  ? parseTimestampRefs(msg.content)
                  : msg.content}
              </div>

              {msg.role === "user" && (
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-100">
                  <User className="h-3.5 w-3.5 text-blue-600" />
                </div>
              )}
            </div>
          ))}

          {/* Loading indicator */}
          {isLoading && (
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gray-100">
                <Bot className="h-3.5 w-3.5 text-gray-500" />
              </div>
              <div className="rounded-xl bg-gray-100 px-4 py-3">
                <div className="flex items-center gap-2 text-sm text-gray-400">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Thinking...
                </div>
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Input bar */}
      <div className="shrink-0 border-t bg-white pt-3">
        <div className="flex items-center gap-2">
          <Input
            ref={inputRef}
            placeholder="Ask a question..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isLoading}
            className="flex-1 text-sm"
          />
          <Button
            size="icon"
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            className="shrink-0 bg-blue-500 text-white hover:bg-blue-600"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
