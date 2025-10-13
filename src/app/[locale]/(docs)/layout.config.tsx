import { i18n } from "@/lib/source";
import type { BaseLayoutProps } from "fumadocs-ui/layouts/shared";
import Image from "next/image";
import { BookOpen, Home } from "lucide-react";

export function baseOptions(locale: string): BaseLayoutProps {
  const isZh = locale === "zh";

  return {
    links: [
      {
        text: isZh ? "主页" : "Home",
        url: "/",
        icon: <Home className="h-4 w-4" />,
      },
      {
        text: isZh ? "文档" : "Documentation",
        url: "/docs",
        icon: <BookOpen className="h-4 w-4" />,
        active: "nested-url",
      },
    ],
    nav: {
      title: (
        <div className="flex items-center gap-2">
          <Image
            src="/favicon.ico"
            alt="CompareHeights Logo"
            width={28}
            height={28}
            className="rounded"
          />
          <span className="text-lg font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
            CompareHeights
          </span>
        </div>
      ),
      transparentMode: "top",
    },
    i18n,
  };
}
