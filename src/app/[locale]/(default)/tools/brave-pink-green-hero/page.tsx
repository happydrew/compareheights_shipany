import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import BravePinkGreenTool from "@/components/brave-pink-green-hero/BravePinkGreenTool";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'brave_pink_green_hero' });

  const baseUrl =
    process.env.NEXT_PUBLIC_WEB_URL?.replace(/\/$/, "") ?? "https://compareheights.org";
  let canonical =
    locale && locale !== "en" ? `${baseUrl}/${locale}` : baseUrl;
  canonical = `${canonical}/tools/brave-pink-green-hero`;

  return {
    title: t('title') + " - Free Photo Editor",
    description: t('subtitle'),
    alternates: {
      // canonical,
    },
  };
}

export default async function BravePinkGreenHeroPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  await params;

  return <BravePinkGreenTool />;
}
