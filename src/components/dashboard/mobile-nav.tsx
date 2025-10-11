"use client";

import { useState } from "react";
import { RiMenuLine } from "react-icons/ri";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

import { DashboardSidebarContent } from "./sidebar";

export function DashboardMobileNav() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="sticky top-4 left-0 z-30 bg-background lg:hidden">
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <div className="flex items-center gap-2">
          <SheetTrigger asChild>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="flex items-center gap-2"
            >
              <RiMenuLine className="h-4 w-4" />
              {/* <span className="text-sm font-medium">Menu</span> */}
            </Button>
          </SheetTrigger>
        </div>
        <SheetContent side="left" className="w-full max-w-xs overflow-hidden p-0">
          <SheetHeader className="border-b border-gray-100 p-4">
            <SheetTitle className="text-base font-semibold text-gray-900">
              Dashboard Navigation
            </SheetTitle>
          </SheetHeader>
          <DashboardSidebarContent
            onNavigate={() => setIsOpen(false)}
            className="overflow-y-auto"
          />
        </SheetContent>
      </Sheet>
    </div>
  );
}
