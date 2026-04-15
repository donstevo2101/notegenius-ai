"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import {
  Mic,
  Search,
  LayoutGrid,
  Users,
  Heart,
  Folder,
  Upload,
  FileText,
  StickyNote,
  Phone,
  Settings,
  Wallet,
  Plus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

const navItems = [
  { label: "All", icon: LayoutGrid, href: "/dashboard", matchExact: true },
  {
    label: "Meetings",
    icon: Users,
    href: "/dashboard?filter=meetings",
    filter: "meetings",
  },
  {
    label: "Favorites",
    icon: Heart,
    href: "/dashboard?filter=favorites",
    filter: "favorites",
  },
  { label: "Folders", icon: Folder, href: "/dashboard/folders" },
  {
    label: "Imported",
    icon: Upload,
    href: "/dashboard?filter=imported",
    filter: "imported",
  },
  { label: "PDF", icon: FileText, href: "/dashboard/pdf" },
  { label: "My Notes", icon: StickyNote, href: "/dashboard/notes" },
  { label: "Phone", icon: Phone, href: "/dashboard/phone" },
];

export function Sidebar({ className }: { className?: string }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentFilter = searchParams.get("filter");

  function isActive(item: (typeof navItems)[number]) {
    if ("filter" in item && item.filter) {
      return pathname === "/dashboard" && currentFilter === item.filter;
    }
    if ("matchExact" in item && item.matchExact) {
      return pathname === "/dashboard" && !currentFilter;
    }
    return pathname.startsWith(item.href.split("?")[0]) && item.href !== "/dashboard";
  }

  return (
    <div
      className={cn(
        "flex h-full w-[260px] flex-col border-r bg-white shadow-sm dark:bg-card dark:border-border",
        className
      )}
    >
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-5 py-5">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500">
          <Mic className="h-4 w-4 text-white" />
        </div>
        <span className="text-lg font-semibold tracking-tight">NoteGenius</span>
      </div>

      {/* New Summary Button */}
      <div className="px-4 pb-3">
        <Button
          className="w-full gap-2 bg-blue-500 text-white hover:bg-blue-600"
          size="default"
          render={<Link href="/dashboard/record" />}
        >
          <Plus className="h-4 w-4" />
          New Summary
        </Button>
      </div>

      {/* Search */}
      <div className="px-4 pb-3">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search..." className="pl-8 text-sm" />
        </div>
      </div>

      {/* Navigation */}
      <ScrollArea className="flex-1 px-3">
        <nav className="flex flex-col gap-0.5 py-1">
          {navItems.map((item) => {
            const active = isActive(item);
            return (
              <Link
                key={item.label}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  active
                    ? "bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400"
                    : "text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-gray-200"
                )}
              >
                <item.icon
                  className={cn(
                    "h-4 w-4 shrink-0",
                    active ? "text-blue-500" : "text-gray-400"
                  )}
                />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <Separator className="my-2" />

        <nav className="flex flex-col gap-0.5 pb-2">
          <Link
            href="/dashboard/billing"
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              pathname === "/dashboard/billing"
                ? "bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400"
                : "text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-gray-200"
            )}
          >
            <Wallet
              className={cn(
                "h-4 w-4 shrink-0",
                pathname === "/dashboard/billing"
                  ? "text-blue-500 dark:text-blue-400"
                  : "text-gray-400"
              )}
            />
            Billing
          </Link>
          <Link
            href="/dashboard/settings"
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              pathname === "/dashboard/settings"
                ? "bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400"
                : "text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-gray-200"
            )}
          >
            <Settings
              className={cn(
                "h-4 w-4 shrink-0",
                pathname === "/dashboard/settings"
                  ? "text-blue-500 dark:text-blue-400"
                  : "text-gray-400"
              )}
            />
            Settings
          </Link>
        </nav>
      </ScrollArea>

      {/* User section */}
      <div className="border-t px-4 py-3">
        <div className="flex items-center gap-3">
          <Avatar size="default">
            <AvatarFallback>SO</AvatarFallback>
          </Avatar>
          <div className="flex flex-col overflow-hidden">
            <span className="truncate text-sm font-medium text-gray-900 dark:text-gray-100">
              Stephen O.
            </span>
            <span className="truncate text-xs text-gray-500 dark:text-gray-400">Free Plan</span>
          </div>
        </div>
      </div>
    </div>
  );
}
