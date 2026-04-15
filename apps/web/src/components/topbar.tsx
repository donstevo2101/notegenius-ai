"use client";

import { useState } from "react";
import { Menu, Mic } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetTitle,
} from "@/components/ui/sheet";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Sidebar } from "@/components/sidebar";

export function Topbar() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <header className="flex h-14 items-center justify-between border-b bg-white dark:bg-card dark:border-border px-4 lg:hidden">
        <Button variant="ghost" size="icon" onClick={() => setOpen(true)}>
          <Menu className="h-5 w-5" />
          <span className="sr-only">Open menu</span>
        </Button>

        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-500">
            <Mic className="h-3.5 w-3.5 text-white" />
          </div>
          <span className="text-sm font-semibold">NoteGenius</span>
        </div>

        <Avatar size="sm">
          <AvatarFallback>SO</AvatarFallback>
        </Avatar>
      </header>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="left" className="w-[260px] p-0" showCloseButton={false}>
          <SheetTitle className="sr-only">Navigation</SheetTitle>
          <Sidebar className="border-r-0 shadow-none" />
        </SheetContent>
      </Sheet>
    </>
  );
}
