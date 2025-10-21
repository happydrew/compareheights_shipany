import type { Metadata } from "next";
import { HeightCompareTool } from "@/components/compareheights";
import { HeightComparisonArticle } from "@/components/compareheights/HeightComparisonArticle";
import { getTranslations } from "next-intl/server";
import { siteConfig } from "@/config/metadata";


export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations();

  const baseUrl = siteConfig.url.replace(/\/$/, "");
  const canonical = locale && locale !== "en" ? `${baseUrl}/${locale}` : baseUrl;

  return {
    // title 和 description 使用父布局的默认值
    // openGraph 和 twitter 会自动继承 title、description 和父布局的其他配置
    alternates: {
      canonical,
    },
    openGraph: {
      url: canonical, // 只需覆盖 url
    },
  };
}

export default async function LandingPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  return (
    <>
      <HeightCompareTool locale={locale} />
      {/* <HeightCompareTool /> */}
      <HeightComparisonArticle />
    </>
  );
}
