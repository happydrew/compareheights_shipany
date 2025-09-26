"use client";

import * as React from "react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { Link } from "@/i18n/navigation";
import { User } from "@/types/user";
import { signOut } from "next-auth/react";
import { useTranslations } from "next-intl";
import { NavItem } from "@/types/blocks/base";

export default function SignUser({ user, isAdmin = false }: { user: User; isAdmin?: boolean }) {
  const t = useTranslations();

  const initial = React.useMemo(() => {
    const source = user?.nickname || user?.email || "";
    const char = source.trim().charAt(0);
    return char ? char.toUpperCase() : "?";
  }, [user?.nickname, user?.email]);

  const dropdownItems: NavItem[] = React.useMemo(() => {
    const items: NavItem[] = [
      {
        title: user.nickname,
      },
      {
        title: t("user.user_center"),
        url: "/my-orders",
      },
    ];

    if (isAdmin) {
      items.push({
        title: t("user.admin_system"),
        url: "/admin/users",
      });
    }

    items.push({
      title: t("user.sign_out"),
      onClick: () => signOut(),
    });

    return items;
  }, [user.nickname, t, isAdmin]);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Avatar className="cursor-pointer">
          <AvatarImage src={user.avatar_url} alt={user.nickname} />
          <AvatarFallback className="bg-blue-600 text-white font-medium">
            {initial}
          </AvatarFallback>
        </Avatar>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="mx-4 space-y-1 border-0 bg-muted/90 p-2 shadow-lg backdrop-blur-sm">
        {dropdownItems.map((item, index) => (
          <DropdownMenuItem
            key={index}
            className="flex w-full cursor-pointer justify-start gap-3 rounded-md px-3 py-2"
          >
            {item.url ? (
              <Link className="block w-full text-left" href={item.url as any} target={item.target}>
                {item.title}
              </Link>
            ) : (
              <button className="block w-full text-left" onClick={item.onClick}>{item.title}</button>
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
