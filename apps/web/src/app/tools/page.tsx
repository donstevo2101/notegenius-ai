"use client";

import Link from "next/link";
import { motion } from "framer-motion";
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
  ArrowRight,
  ChevronDown,
  Menu,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { tools, categories, getToolsByCategory } from "@/lib/tool-config";
import type { ToolConfig } from "@/lib/tool-config";
import { useState } from "react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

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

const fadeIn = {
  initial: { opacity: 1, y: 0 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-50px" },
  transition: { duration: 0.3 },
};

/* ───────────────────────── HEADER ───────────────────────── */
function ToolsHeader() {
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

        {/* Desktop nav */}
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

        {/* Mobile hamburger */}
        <button
          className="md:hidden p-2"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label="Toggle menu"
        >
          {mobileOpen ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>
      </div>

      {/* Mobile menu */}
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

/* ───────────────────────── TOOL CARD ───────────────────────── */
function ToolCard({ tool, index }: { tool: ToolConfig; index: number }) {
  const Icon = iconMap[tool.icon] || Video;
  return (
    <motion.div
      {...fadeIn}
      transition={{ duration: 0.5, delay: index * 0.06 }}
    >
      <Link href={`/tools/${tool.slug}`} className="block h-full">
        <div className="relative h-full bg-white rounded-2xl p-6 shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5 border border-gray-100 group">
          {tool.comingSoon && (
            <span className="absolute top-4 right-4 text-[10px] font-semibold uppercase tracking-wider text-orange-500 bg-orange-50 px-2 py-0.5 rounded-full">
              Coming Soon
            </span>
          )}
          <div className="w-11 h-11 rounded-xl bg-[#DBEAFE] flex items-center justify-center mb-4">
            <Icon className="size-5 text-[#3B82F6]" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900">{tool.title}</h3>
          <p className="mt-2 text-sm text-gray-500 leading-relaxed">
            {tool.description}
          </p>
          <div className="mt-4 flex items-center gap-1 text-sm font-medium text-[#3B82F6] group-hover:gap-2 transition-all">
            Try Free <ArrowRight className="size-3.5" />
          </div>
        </div>
      </Link>
    </motion.div>
  );
}

/* ───────────────────────── FOOTER ───────────────────────── */
function ToolsFooter() {
  return (
    <footer className="bg-gray-900 text-gray-400 py-12 px-4">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2 text-lg font-bold text-white">
          <span className="text-xl">🎙️</span>
          <span>
            NoteGenius <span className="text-[#3B82F6]">AI</span>
          </span>
        </div>
        <p className="text-sm">
          &copy; {new Date().getFullYear()} NoteGenius AI. All rights reserved.
        </p>
      </div>
    </footer>
  );
}

/* ───────────────────────── PAGE ───────────────────────── */
export default function ToolsIndexPage() {
  return (
    <main>
      <ToolsHeader />

      {/* Hero */}
      <section className="bg-gradient-to-b from-[#EFF6FF] to-white py-16 px-4">
        <motion.div {...fadeIn} className="max-w-3xl mx-auto text-center">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 leading-tight">
            Free AI-Powered{" "}
            <span className="text-[#3B82F6]">Tools</span>
          </h1>
          <p className="mt-4 text-lg text-gray-500 max-w-2xl mx-auto">
            Transcribe, translate, summarize, and convert your media files for
            free. Powered by state-of-the-art AI.
          </p>
        </motion.div>
      </section>

      {/* Category sections */}
      {categories.map((cat) => {
        const categoryTools = getToolsByCategory(cat.key);
        return (
          <section
            key={cat.key}
            className="py-16 px-4 even:bg-[#FAFBFC] odd:bg-white"
          >
            <div className="max-w-7xl mx-auto">
              <motion.div {...fadeIn} className="mb-10">
                <span
                  className={`inline-flex items-center text-xs font-semibold uppercase tracking-wider px-3 py-1 rounded-full ${cat.color}`}
                >
                  {cat.label}
                </span>
              </motion.div>

              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {categoryTools.map((tool, i) => (
                  <ToolCard key={tool.slug} tool={tool} index={i} />
                ))}
              </div>
            </div>
          </section>
        );
      })}

      {/* CTA */}
      <section className="py-20 px-4 bg-gradient-to-b from-white to-[#EFF6FF]">
        <motion.div {...fadeIn} className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900">
            Want unlimited access?
          </h2>
          <p className="mt-4 text-gray-500 text-lg">
            Sign up for free and unlock unlimited transcriptions, summaries, and
            more.
          </p>
          <Link href="/signup">
            <Button className="mt-8 bg-[#3B82F6] hover:bg-[#2563EB] text-white rounded-full px-10 h-12 text-base cursor-pointer">
              Start For Free
            </Button>
          </Link>
        </motion.div>
      </section>

      <ToolsFooter />
    </main>
  );
}
