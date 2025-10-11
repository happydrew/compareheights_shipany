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
import { RiArrowDownSLine } from "react-icons/ri";

export default function SignUser({ user, isAdmin = false }: { user: User; isAdmin?: boolean }) {
  const t = useTranslations();
  const [open, setOpen] = React.useState(false);
  const closeTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const triggerRef = React.useRef<HTMLButtonElement | null>(null);

  const initial = React.useMemo(() => {
    const source = user?.nickname || user?.email || "";
    const char = source.trim().charAt(0);
    return char ? char.toUpperCase() : "?";
  }, [user?.nickname, user?.email]);

  const cancelCloseTimeout = () => {
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = null;
    }
  };

  const openMenu = () => {
    cancelCloseTimeout();
    setOpen(true);
  };

  const scheduleCloseMenu = () => {
    cancelCloseTimeout();
    closeTimeoutRef.current = setTimeout(() => {
      setOpen(false);
      closeTimeoutRef.current = null;
    }, 120);
  };

  const closeMenuImmediately = () => {
    cancelCloseTimeout();
    setOpen(false);
  };

  const handleTriggerMouseEnter = () => {
    openMenu();
  };

  const handleTriggerMouseLeave = (event: React.MouseEvent<HTMLButtonElement>) => {
    const nextTarget = event.relatedTarget as HTMLElement | null;
    const movingToMenu = nextTarget?.closest("[data-slot='dropdown-menu-content']");

    if (movingToMenu) {
      cancelCloseTimeout();
      return;
    }

    scheduleCloseMenu();
  };

  const handleContentMouseEnter = () => {
    openMenu();
  };

  const handleContentMouseLeave = (event: React.MouseEvent<HTMLDivElement>) => {
    const nextTarget = event.relatedTarget as HTMLElement | null;

    if (nextTarget && triggerRef.current?.contains(nextTarget)) {
      cancelCloseTimeout();
      return;
    }

    scheduleCloseMenu();
  };

  const dropdownItems: NavItem[] = React.useMemo(() => {
    const items: NavItem[] = [
      {
        title: user.nickname,
        isHeader: true,
      },
      {
        title: t("user.dashboard"),
        url: "/dashboard",
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

  const handleItemClick = (item: NavItem) => {
    if (item.onClick) {
      item.onClick();
      closeMenuImmediately();
    } else if (item.url) {
      closeMenuImmediately();
    }
  };

  const handleMenuOpenChange = React.useCallback(
    (nextOpen: boolean) => {
      if (nextOpen) {
        openMenu();
      } else {
        closeMenuImmediately();
      }
    },
    [openMenu, closeMenuImmediately]
  );

  React.useEffect(() => {
    return () => {
      cancelCloseTimeout();
    };
  }, [cancelCloseTimeout]);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          ref={triggerRef}
          type="button"
          // onMouseEnter={handleTriggerMouseEnter}
          // onMouseLeave={handleTriggerMouseLeave}
          aria-haspopup="menu"
          aria-expanded={open}
          className="group flex items-center gap-2 rounded-full border border-transparent bg-transparent px-2 py-1 transition-colors hover:border-muted-foreground/20 hover:bg-muted/60 focus:outline-hidden cursor-pointer"
        >
          <Avatar className="h-9 w-9 transition-opacity group-hover:opacity-80">
            <AvatarImage src={user.avatar_url} alt={user.nickname} />
            <AvatarFallback className="bg-blue-600 text-white font-medium">
              {initial}
            </AvatarFallback>
          </Avatar>
          <RiArrowDownSLine
            className={`h-4 w-4 text-muted-foreground transition-transform group-hover:text-foreground ${open ? "rotate-180 text-foreground" : ""}`}
          />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        className="mx-4 w-48 border-0 bg-muted/90 p-2 shadow-lg backdrop-blur-sm cursor-pointer"
      // onMouseEnter={handleContentMouseEnter}
      // onMouseLeave={handleContentMouseLeave}
      >
        {dropdownItems.map((item, index) => {
          if (item.isHeader) {
            return (
              <div
                key={index}
                className="px-3 py-2 text-sm font-semibold cursor-default"
              >
                {item.title}
              </div>
            );
          }

          if (item.url) {
            return (
              <DropdownMenuItem
                key={index}
                asChild
                className="cursor-pointer hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground active:bg-accent/80 transition-colors rounded-md px-3 py-2"
                onClick={() => handleItemClick(item)}
              >
                <Link href={item.url as any} target={item.target}>
                  {item.title}
                </Link>
              </DropdownMenuItem>
            );
          }

          return (
            <DropdownMenuItem
              key={index}
              className="cursor-pointer hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground active:bg-accent/80 transition-colors rounded-md px-3 py-2"
              onClick={() => handleItemClick(item)}
            >
              {item.title}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
