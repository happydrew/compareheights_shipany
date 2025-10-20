import {
  getMessages,
  getTranslations,
  setRequestLocale,
} from "next-intl/server";
import { AppContextProvider } from "@/contexts/app";
import { Metadata } from "next";
import { NextAuthSessionProvider } from "@/auth/session";
import { NextIntlClientProvider } from "next-intl";
import { ThemeProvider } from "@/providers/theme";
import { FeedbackWidget } from "@/components/blocks/FeedbackWidget";
import { AnnouncementBanner } from "@/components/announcement/AnnouncementBanner";
import { AnnouncementModal } from "@/components/announcement/AnnouncementModal";
import { locales } from "@/i18n/locale";
import { siteConfig, getAbsoluteUrl } from "@/config/metadata";

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations();
  const siteName = t("metadata.siteName") || siteConfig.name;

  return {
    title: {
      template: `%s | ${siteName}`,
      default: t("metadata.title") || "",
    },
    description: t("metadata.description") || "",
    // openGraph 和 twitter 配置会自动继承页面的 title 和 description
    // Open Graph 公共配置 - 子页面会自动继承 title 和 description
    openGraph: {
      siteName: siteName,
      locale: locale,
      type: 'website',
      images: [{
        url: getAbsoluteUrl(siteConfig.defaultOgImage),
      }],
    },
    // Twitter Cards 公共配置 - 子页面会自动继承 title 和 description
    twitter: {
      card: "summary_large_image",
      site: siteConfig.twitterHandle,
      creator: siteConfig.twitterHandle,
    },
  };
}

export default async function LocaleLayout({
  children,
  params,
}: Readonly<{
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}>) {
  const { locale } = await params;
  setRequestLocale(locale);

  const messages = await getMessages();

  return (
    <NextIntlClientProvider messages={messages}>
      <NextAuthSessionProvider>
        <AppContextProvider>
          <ThemeProvider>
            {/* 全局公告组件 */}
            <AnnouncementBanner />
            <AnnouncementModal />
            {/* 全局反馈组件 */}
            <FeedbackWidget />
            {children}
          </ThemeProvider>
        </AppContextProvider>
      </NextAuthSessionProvider>
    </NextIntlClientProvider>
  );
}
