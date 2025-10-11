"use client";

import { useAppContext } from "@/contexts/app";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { signOut } from "next-auth/react";
import {
  RiUser3Line,
  RiLogoutBoxLine,
  RiSettings4Line,
  RiNotification3Line,
} from "react-icons/ri";
import Link from "next/link";

export function DashboardHeader() {
  const { user } = useAppContext();

  const handleSignOut = async () => {
    await signOut({ callbackUrl: "/" });
  };

  const userInitial = user?.nickname?.charAt(0)?.toUpperCase() || user?.email?.charAt(0)?.toUpperCase() || "U";

  return (
    <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6 sticky top-0 z-10">
      {/* Left - Can add breadcrumb or search here */}
      <div className="flex items-center gap-4 flex-1">
        {/* Placeholder for future features like search */}
      </div>

      {/* Right - Notifications & User Menu */}
      <div className="flex items-center gap-3">
        {/* Notifications Button */}
        <Button
          variant="ghost"
          size="sm"
          className="relative h-9 w-9 rounded-full"
        >
          <RiNotification3Line className="h-5 w-5 text-gray-600" />
          {/* Notification badge */}
          <span className="absolute top-1 right-1 h-2 w-2 bg-green-theme-500 rounded-full ring-2 ring-white" />
        </Button>

        {/* User Menu */}
        {user && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-9 px-2 rounded-full hover:bg-gray-100">
                <div className="flex items-center gap-2">
                  <Avatar className="h-8 w-8 ring-2 ring-gray-100">
                    <AvatarImage
                      src={user.avatar_url || ""}
                      alt={user.nickname || user.email}
                    />
                    <AvatarFallback className="bg-gradient-to-br from-green-theme-500 to-green-theme-600 text-white text-sm font-medium">
                      {userInitial}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm font-medium text-gray-700 hidden md:block">
                    {user.nickname || user.email?.split("@")[0]}
                  </span>
                </div>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end" forceMount>
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">
                    {user.nickname || "User"}
                  </p>
                  <p className="text-xs leading-none text-muted-foreground">
                    {user.email}
                  </p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link
                  href="/dashboard/profile"
                  className="flex items-center cursor-pointer"
                >
                  <RiUser3Line className="mr-2 h-4 w-4" />
                  <span>Profile</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link
                  href="/dashboard/subscription"
                  className="flex items-center cursor-pointer"
                >
                  <RiSettings4Line className="mr-2 h-4 w-4" />
                  <span>Settings</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={handleSignOut}
                className="cursor-pointer text-red-600 focus:text-red-600"
              >
                <RiLogoutBoxLine className="mr-2 h-4 w-4" />
                <span>Sign out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </header>
  );
}
