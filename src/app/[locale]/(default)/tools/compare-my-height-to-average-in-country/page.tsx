import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { CompareHeightToAverageInCountry } from "@/components/compare-my-height-to-average-in-country/CompareHeightToAverageInCountry";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'compare_height_country' });

  const baseUrl =
    process.env.NEXT_PUBLIC_WEB_URL?.replace(/\/$/, "") ?? "https://compareheights.org";
  let canonical =
    locale && locale !== "en" ? `${baseUrl}/${locale}` : baseUrl;
  canonical = `${canonical}/tools/brave-pink-green-hero`;

  return {
    title: t('metadata.title'),
    description: t('metadata.description'),
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

  return <CompareHeightToAverageInCountry />;
}
