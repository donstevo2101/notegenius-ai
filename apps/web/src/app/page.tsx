"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  Mic,
  FileText,
  Sparkles,
  MessageSquare,
  EyeOff,
  Languages,
  ShieldCheck,
  Infinity,
  Mail,
  Briefcase,
  GraduationCap,
  Radio,
  Users,
  Star,
  Monitor,
  Smartphone,
  Check,
  Menu,
  X,
  ChevronDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { categories, getToolsByCategory } from "@/lib/tool-config";
import { useState } from "react";

const fadeIn = {
  initial: { opacity: 1, y: 0 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-50px" },
  transition: { duration: 0.3 },
};

/* ───────────────────────── TOP BANNER ───────────────────────── */
function TopBanner() {
  return (
    <div className="bg-[#3B82F6] text-white text-center py-2 px-4 text-sm font-medium">
      #1 Transcription App 2026 &nbsp;
      <span className="text-yellow-300">★★★★★</span> &nbsp; Rated 4.9 out of 5
    </div>
  );
}

/* ───────────────────────── HEADER / NAV ───────────────────────── */
function Header() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100">
      <div className="max-w-7xl mx-auto flex items-center justify-between px-4 py-3">
        <a href="#" className="flex items-center gap-2 text-xl font-bold">
          <span className="text-2xl">🎙️</span>
          <span>
            NoteGenius <span className="text-[#3B82F6]">AI</span>
          </span>
        </a>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-gray-600">
          <a href="#features" className="hover:text-gray-900 transition-colors">
            Features
          </a>

          <Link href="/tools" className="hover:text-gray-900 transition-colors">
            Tools
          </Link>

          <a
            href="#solutions"
            className="hover:text-gray-900 transition-colors"
          >
            Solutions
          </a>
          <a href="#pricing" className="hover:text-gray-900 transition-colors">
            Pricing
          </a>
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
            <a href="#features" onClick={() => setMobileOpen(false)}>
              Features
            </a>
            <Link href="/tools" onClick={() => setMobileOpen(false)}>
              Tools
            </Link>
            <a href="#solutions" onClick={() => setMobileOpen(false)}>
              Solutions
            </a>
            <a href="#pricing" onClick={() => setMobileOpen(false)}>
              Pricing
            </a>
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

/* ───────────────────────── HERO ───────────────────────── */
function Hero() {
  return (
    <section className="bg-gradient-to-b from-[#FDF2F8] via-[#EFF6FF] to-white py-20 px-4">
      <div className="max-w-7xl mx-auto grid md:grid-cols-2 gap-12 items-center">
        <motion.div {...fadeIn}>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold leading-tight tracking-tight text-gray-900">
            Get{" "}
            <span className="text-[#3B82F6]">perfect notes</span> after every
            meeting with NoteGenius AI.
          </h1>
          <p className="mt-6 text-lg text-gray-600 max-w-lg leading-relaxed">
            NoteGenius AI distills lengthy meetings into concise summaries,
            including key points, decisions made, and assigned action items.
          </p>
          <div className="mt-8 flex flex-wrap gap-4">
            <Link href="/signup">
              <Button className="bg-gray-900 hover:bg-gray-800 text-white rounded-full px-8 h-12 text-base cursor-pointer">
                <Smartphone className="size-4 mr-2" />
                Download App
              </Button>
            </Link>
            <Link href="/signup">
              <Button
                variant="outline"
                className="rounded-full px-8 h-12 text-base border-[#3B82F6] text-[#3B82F6] hover:bg-[#EFF6FF] bg-gradient-to-r from-[#FDF2F8] to-white cursor-pointer"
              >
                <Monitor className="size-4 mr-2" />
                Start on Web
              </Button>
            </Link>
          </div>
        </motion.div>

        {/* Mock device screenshots */}
        <motion.div
          {...fadeIn}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="relative flex items-center justify-center"
        >
          {/* Laptop mock */}
          <div className="relative w-72 h-48 md:w-80 md:h-52 bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden">
            <div className="h-6 bg-gray-100 border-b border-gray-200 flex items-center gap-1.5 px-3">
              <span className="w-2 h-2 rounded-full bg-red-400" />
              <span className="w-2 h-2 rounded-full bg-yellow-400" />
              <span className="w-2 h-2 rounded-full bg-green-400" />
            </div>
            <div className="p-4 space-y-2">
              <div className="h-3 bg-[#DBEAFE] rounded w-3/4" />
              <div className="h-3 bg-gray-100 rounded w-full" />
              <div className="h-3 bg-gray-100 rounded w-5/6" />
              <div className="mt-3 h-3 bg-[#3B82F6]/20 rounded w-2/3" />
              <div className="h-3 bg-gray-100 rounded w-4/5" />
              <div className="h-3 bg-gray-100 rounded w-3/5" />
            </div>
          </div>

          {/* Phone mock */}
          <div className="absolute -bottom-4 -right-2 md:right-4 w-32 h-56 md:w-36 md:h-64 bg-white rounded-3xl shadow-2xl border-2 border-gray-200 overflow-hidden">
            <div className="h-5 bg-gray-900 rounded-b-xl mx-auto w-16 mt-1" />
            <div className="p-3 space-y-2 mt-2">
              <div className="h-2.5 bg-[#3B82F6] rounded w-1/2" />
              <div className="h-2 bg-gray-100 rounded w-full" />
              <div className="h-2 bg-gray-100 rounded w-4/5" />
              <div className="mt-2 h-2.5 bg-[#DBEAFE] rounded w-2/3" />
              <div className="h-2 bg-gray-100 rounded w-full" />
              <div className="h-2 bg-gray-100 rounded w-3/4" />
              <div className="mt-2 flex items-center gap-1">
                <div className="w-6 h-6 rounded-full bg-[#3B82F6]/20 flex items-center justify-center">
                  <Mic className="size-3 text-[#3B82F6]" />
                </div>
                <div className="h-2 bg-[#3B82F6]/30 rounded flex-1" />
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

/* ───────────────────────── HOW IT WORKS ───────────────────────── */
function HowItWorks() {
  const steps = [
    {
      icon: Mic,
      title: "Record",
      desc: "Hit record and capture every word",
      color: "bg-blue-50 text-[#3B82F6]",
    },
    {
      icon: FileText,
      title: "Transcribe",
      desc: "AI transcribes with speaker labels",
      color: "bg-purple-50 text-purple-500",
    },
    {
      icon: Sparkles,
      title: "Summarize",
      desc: "Get key points, decisions & action items",
      color: "bg-amber-50 text-amber-500",
    },
  ];

  return (
    <section className="py-20 px-4 bg-white">
      <div className="max-w-7xl mx-auto">
        <motion.div {...fadeIn} className="text-center mb-14">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900">
            How It Works
          </h2>
          <p className="mt-3 text-gray-500">
            Three simple steps to perfect notes
          </p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-8">
          {steps.map((step, i) => (
            <motion.div
              key={step.title}
              {...fadeIn}
              transition={{ duration: 0.5, delay: i * 0.15 }}
              className="text-center"
            >
              <div
                className={`w-16 h-16 rounded-2xl ${step.color} flex items-center justify-center mx-auto mb-5`}
              >
                <step.icon className="size-7" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900">
                {step.title}
              </h3>
              <p className="mt-2 text-gray-500">{step.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ───────────────────────── STATS ───────────────────────── */
function Stats() {
  const stats = [
    { value: "10M+", label: "Active Users" },
    { value: "20M+", label: "Monthly Recordings" },
    { value: "120+", label: "Languages Supported" },
    { value: "4.9/5", label: "App Rating" },
  ];

  return (
    <section className="py-20 px-4 bg-gradient-to-b from-white to-[#EFF6FF]">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {stats.map((stat, i) => (
            <motion.div
              key={stat.label}
              {...fadeIn}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className="text-center"
            >
              <div className="text-4xl md:text-5xl font-bold text-[#3B82F6]">
                {stat.value}
              </div>
              <div className="mt-2 text-gray-500 font-medium">
                {stat.label}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ───────────────────────── FEATURES GRID ───────────────────────── */
function Features() {
  const features = [
    {
      icon: Sparkles,
      title: "AI Summaries",
      desc: "Captures key insights, action items, and decisions",
    },
    {
      icon: FileText,
      title: "Live Transcribe",
      desc: "Delivers instant transcripts with voice identification",
    },
    {
      icon: Mic,
      title: "Phone Recording",
      desc: "Record calls with Twilio integration — unlimited length",
    },
    {
      icon: MessageSquare,
      title: "AI Chat",
      desc: "Ask questions about your recordings and get instant answers",
    },
    {
      icon: EyeOff,
      title: "Background Recording",
      desc: "Operates silently without disrupting conversations",
    },
    {
      icon: Languages,
      title: "Translate Live",
      desc: "Support for 120+ languages in real-time",
    },
    {
      icon: ShieldCheck,
      title: "Private & Secure",
      desc: "100% secure with end-to-end encryption",
    },
    {
      icon: Infinity,
      title: "Unlimited Recording",
      desc: "No time limits. Record for hours without interruption",
    },
    {
      icon: Mail,
      title: "Auto-Email Notes",
      desc: "Summaries delivered to your inbox automatically",
    },
  ];

  return (
    <section id="features" className="py-20 px-4 bg-[#EFF6FF]">
      <div className="max-w-7xl mx-auto">
        <motion.div {...fadeIn} className="text-center mb-14">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900">
            Powerful Features
          </h2>
          <p className="mt-3 text-gray-500">
            Everything you need for perfect meeting notes
          </p>
        </motion.div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, i) => (
            <motion.div
              key={feature.title}
              {...fadeIn}
              transition={{ duration: 0.5, delay: i * 0.06 }}
              className="bg-white rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="w-11 h-11 rounded-xl bg-[#DBEAFE] flex items-center justify-center mb-4">
                <feature.icon className="size-5 text-[#3B82F6]" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">
                {feature.title}
              </h3>
              <p className="mt-2 text-sm text-gray-500 leading-relaxed">
                {feature.desc}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ───────────────────────── SOLUTIONS ───────────────────────── */
function Solutions() {
  const solutions = [
    {
      icon: Briefcase,
      title: "Sales",
      desc: "Never miss a client's needs",
      gradient: "from-blue-50 to-blue-100/50",
    },
    {
      icon: GraduationCap,
      title: "Education",
      desc: "Perfect notes from every lecture",
      gradient: "from-purple-50 to-purple-100/50",
    },
    {
      icon: Radio,
      title: "Media & Podcasting",
      desc: "Transcribe interviews instantly",
      gradient: "from-pink-50 to-pink-100/50",
    },
    {
      icon: Users,
      title: "Consulting",
      desc: "Document every engagement",
      gradient: "from-amber-50 to-amber-100/50",
    },
  ];

  return (
    <section
      id="solutions"
      className="py-20 px-4 bg-gradient-to-b from-[#EFF6FF] to-white"
    >
      <div className="max-w-7xl mx-auto">
        <motion.div {...fadeIn} className="text-center mb-14">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900">
            Built for Every Team
          </h2>
          <p className="mt-3 text-gray-500">
            Solutions tailored to your industry
          </p>
        </motion.div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {solutions.map((sol, i) => (
            <motion.div
              key={sol.title}
              {...fadeIn}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className={`bg-gradient-to-br ${sol.gradient} rounded-2xl p-6 border border-gray-100 hover:shadow-md transition-shadow`}
            >
              <div className="w-12 h-12 rounded-xl bg-white/80 flex items-center justify-center mb-4 shadow-sm">
                <sol.icon className="size-6 text-[#3B82F6]" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">
                {sol.title}
              </h3>
              <p className="mt-2 text-sm text-gray-500">{sol.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ───────────────────────── TESTIMONIAL ───────────────────────── */
function Testimonial() {
  return (
    <section className="py-20 px-4 bg-white">
      <motion.div {...fadeIn} className="max-w-3xl mx-auto text-center">
        <div className="flex justify-center gap-1 mb-6">
          {[...Array(5)].map((_, i) => (
            <Star
              key={i}
              className="size-5 text-yellow-400 fill-yellow-400"
            />
          ))}
        </div>
        <blockquote className="text-xl md:text-2xl font-medium text-gray-900 leading-relaxed">
          &ldquo;NoteGenius AI has transformed how our team handles meetings.
          The AI summaries save us hours every week.&rdquo;
        </blockquote>
        <p className="mt-6 text-gray-500 font-medium">
          — Sarah Chen, Product Manager
        </p>
      </motion.div>
    </section>
  );
}

/* ───────────────────────── PRICING ───────────────────────── */
function Pricing() {
  const tiers = [
    {
      name: "Free",
      price: "£0",
      period: "/mo",
      features: ["5 recordings/mo", "30 min max", "Basic summaries"],
      highlighted: false,
      badge: null,
    },
    {
      name: "Pro",
      price: "£12",
      period: "/mo",
      features: [
        "Unlimited recordings",
        "Unlimited length",
        "AI Q&A",
        "Phone recording",
        "Auto-email",
      ],
      highlighted: true,
      badge: "Most Popular",
    },
    {
      name: "Team",
      price: "£29",
      period: "/mo",
      features: [
        "Everything in Pro",
        "Team workspace",
        "Admin controls",
        "Priority support",
      ],
      highlighted: false,
      badge: null,
    },
  ];

  return (
    <section
      id="pricing"
      className="py-20 px-4 bg-gradient-to-b from-white to-[#FDF2F8]"
    >
      <div className="max-w-7xl mx-auto">
        <motion.div {...fadeIn} className="text-center mb-14">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900">
            Simple, Transparent Pricing
          </h2>
          <p className="mt-3 text-gray-500">
            Start free. Upgrade when you need more.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {tiers.map((tier, i) => (
            <motion.div
              key={tier.name}
              {...fadeIn}
              transition={{ duration: 0.5, delay: i * 0.12 }}
              className={`relative bg-white rounded-2xl p-8 shadow-sm ${
                tier.highlighted
                  ? "border-2 border-[#3B82F6] shadow-md"
                  : "border border-gray-200"
              }`}
            >
              {tier.badge && (
                <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#3B82F6] text-white text-xs px-3 h-6">
                  {tier.badge}
                </Badge>
              )}
              <h3 className="text-xl font-semibold text-gray-900">
                {tier.name}
              </h3>
              <div className="mt-4 flex items-baseline">
                <span className="text-4xl font-bold text-gray-900">
                  {tier.price}
                </span>
                <span className="text-gray-500 ml-1">{tier.period}</span>
              </div>
              <ul className="mt-6 space-y-3">
                {tier.features.map((f) => (
                  <li
                    key={f}
                    className="flex items-start gap-2 text-sm text-gray-600"
                  >
                    <Check className="size-4 text-[#3B82F6] mt-0.5 shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
              <Link href="/signup" className="w-full">
                <Button
                  className={`mt-8 w-full rounded-full h-10 text-sm cursor-pointer ${
                    tier.highlighted
                      ? "bg-[#3B82F6] hover:bg-[#2563EB] text-white"
                      : "bg-gray-900 hover:bg-gray-800 text-white"
                  }`}
                >
                  Get Started
                </Button>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ───────────────────────── FAQ ───────────────────────── */
function FAQ() {
  const faqs = [
    {
      q: "How long can I record?",
      a: "With NoteGenius Pro, there are no limits. Record meetings, lectures, or interviews for as long as you need. Free tier supports up to 30 minutes per recording.",
    },
    {
      q: "Which languages are supported?",
      a: "We support 120+ languages for transcription and translation, including English, Spanish, French, Mandarin, Arabic, Hindi, and many more. Language detection is automatic.",
    },
    {
      q: "Is my data secure?",
      a: "Yes, all recordings are encrypted end-to-end. Your data is stored on secure, SOC 2-compliant servers. We never share your recordings or transcripts with third parties.",
    },
    {
      q: "Can I record phone calls?",
      a: "Yes, with our Twilio integration you can record both incoming and outgoing phone calls. Simply dial through the NoteGenius app and the recording starts automatically.",
    },
    {
      q: "How does the AI summary work?",
      a: "Our AI analyzes your transcript to identify key points, decisions, action items, and follow-ups. It creates a structured summary that captures the essence of your meeting in seconds.",
    },
  ];

  return (
    <section className="py-20 px-4 bg-[#FDF2F8]">
      <div className="max-w-3xl mx-auto">
        <motion.div {...fadeIn} className="text-center mb-14">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900">
            Frequently Asked Questions
          </h2>
        </motion.div>

        <motion.div {...fadeIn}>
          <Accordion>
            {faqs.map((faq, i) => (
              <AccordionItem key={i} value={`faq-${i}`}>
                <AccordionTrigger className="text-base font-medium text-gray-900 py-4">
                  {faq.q}
                </AccordionTrigger>
                <AccordionContent>
                  <p className="text-gray-600 leading-relaxed">{faq.a}</p>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </motion.div>
      </div>
    </section>
  );
}

/* ───────────────────────── FINAL CTA ───────────────────────── */
function FinalCTA() {
  return (
    <section className="py-20 px-4 bg-gradient-to-b from-[#FDF2F8] to-[#EFF6FF]">
      <motion.div {...fadeIn} className="max-w-3xl mx-auto text-center">
        <h2 className="text-3xl md:text-4xl font-bold text-gray-900">
          Get rid of manual meeting notes
        </h2>
        <p className="mt-4 text-gray-500 text-lg">
          Join millions of professionals who trust NoteGenius AI.
        </p>
        <Link href="/signup">
          <Button className="mt-8 bg-[#3B82F6] hover:bg-[#2563EB] text-white rounded-full px-10 h-12 text-base cursor-pointer">
            Start For Free
          </Button>
        </Link>
      </motion.div>
    </section>
  );
}

/* ───────────────────────── FOOTER ───────────────────────── */
function Footer() {
  const columns = [
    {
      title: "Features",
      links: [
        "AI Summaries",
        "Live Transcribe",
        "Phone Recording",
        "AI Chat",
        "Auto-Email Notes",
      ],
    },
    {
      title: "Solutions",
      links: ["Sales", "Education", "Media & Podcasting", "Consulting"],
    },
    {
      title: "Resources",
      links: ["Blog", "Help Center", "API Docs", "Community"],
    },
    {
      title: "Legal",
      links: ["Privacy Policy", "Terms of Service", "Cookie Policy", "GDPR"],
    },
  ];

  return (
    <footer className="bg-gray-900 text-gray-400 py-16 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-10">
          {/* Brand */}
          <div className="lg:col-span-1">
            <div className="flex items-center gap-2 text-lg font-bold text-white">
              <span className="text-xl">🎙️</span>
              <span>
                NoteGenius <span className="text-[#3B82F6]">AI</span>
              </span>
            </div>
            <p className="mt-3 text-sm leading-relaxed">
              Perfect notes after every meeting.
            </p>
          </div>

          {/* Link columns */}
          {columns.map((col) => (
            <div key={col.title}>
              <h4 className="text-white font-semibold text-sm mb-4">
                {col.title}
              </h4>
              <ul className="space-y-2.5">
                {col.links.map((link) => (
                  <li key={link}>
                    <a
                      href="#"
                      className="text-sm hover:text-white transition-colors"
                    >
                      {link}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 pt-8 border-t border-gray-800 text-center text-sm">
          &copy; {new Date().getFullYear()} NoteGenius AI. All rights reserved.
        </div>
      </div>
    </footer>
  );
}

/* ───────────────────────── PAGE ───────────────────────── */
export default function Home() {
  return (
    <main>
      <TopBanner />
      <Header />
      <Hero />
      <HowItWorks />
      <Stats />
      <Features />
      <Solutions />
      <Testimonial />
      <Pricing />
      <FAQ />
      <FinalCTA />
      <Footer />
    </main>
  );
}
