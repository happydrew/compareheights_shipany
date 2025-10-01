import type { Metadata } from "next";
import { HeightCompareTool } from "@/components/compareheights";
import { HeightComparisonArticle } from "@/components/compareheights/HeightComparisonArticle";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const baseUrl =
    process.env.NEXT_PUBLIC_WEB_URL?.replace(/\/$/, "") ?? "https://compareheights.org";
  const canonical =
    locale && locale !== "en" ? `${baseUrl}/${locale}` : baseUrl;

  return {
    title: "Height Comparison - Comparing Heights of Unlimited Objects Easily",
    description: "Create stunning height comparison chart of Unlimited Objects effortlessly, comparing heights of people, celebrities, anime characters, animals, buildings & anything, export & share beautiful visualizations.",
    alternates: {
      canonical,
    },
  };
}

export default async function LandingPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  await params;

  return (
    <>
      <HeightCompareTool />
      <HeightComparisonArticle />
    </>
  );
}
