import { source } from "@/lib/source";
import { RootProvider } from "fumadocs-ui/provider";
import { DocsLayout } from "fumadocs-ui/layouts/notebook";
import { baseOptions } from "./layout.config";
import type { ReactNode } from "react";
import type { Translations } from "fumadocs-ui/i18n";
import "./style.css";

const zh: Partial<Translations> = {
  search: "搜索内容",
  searchNoResult: "未找到结果",
  toc: "目录",
  tocNoHeadings: "此页面没有标题",
  lastUpdate: "最后更新",
  chooseLanguage: "选择语言",
  nextPage: "下一页",
  previousPage: "上一页",
};

// available languages that will be displayed on UI
// make sure `locale` is consistent with your i18n config
const locales = [
  {
    name: "English",
    locale: "en",
  },
  {
    name: "简体中文",
    locale: "zh",
  },
];

export default async function DocsRootLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ locale?: string }>;
}) {
  const { locale } = await params;
  const lang = locale || "en";

  return (
    <RootProvider
      i18n={{
        locale: lang,
        locales,
        translations: { zh }[lang],
      }}
      search={{
        options: {
          api: "/api/docs/search",
        },
      }}
    >
      <DocsLayout
        {...baseOptions(lang)}
        tree={source.pageTree[lang]}
        nav={{ ...baseOptions(lang).nav, mode: "top" }}
        sidebar={{
          tabs: [],
          collapsible: true,
          defaultOpenLevel: 0,
        }}
        tabMode="sidebar"
      >
        {children}
      </DocsLayout>
    </RootProvider>
  );
}
