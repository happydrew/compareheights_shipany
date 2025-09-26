import { LandingPage, PricingPage, ShowcasePage } from "@/types/pages/landing";
import * as JSONC from "jsonc-parser";
import { readFileSync } from "fs";
import { join } from "path";

export async function getLandingPage(locale: string): Promise<LandingPage> {
  return (await getPage("landing", locale)) as LandingPage;
}

export async function getPricingPage(locale: string): Promise<PricingPage> {
  return (await getPage("pricing", locale)) as PricingPage;
}

export async function getShowcasePage(locale: string): Promise<ShowcasePage> {
  return (await getPage("showcase", locale)) as ShowcasePage;
}

export async function getPage(
  name: string,
  locale: string
): Promise<LandingPage | PricingPage | ShowcasePage> {
  try {
    if (locale === "zh-CN") {
      locale = "zh";
    }

    // 读取 JSONC 文件
    const filePath = join(process.cwd(), `src/i18n/pages/${name}/${locale.toLowerCase()}.jsonc`);
    const content = readFileSync(filePath, "utf-8");
    const data = JSONC.parse(content);

    if (!data) {
      throw new Error(`Failed to parse JSONC content for ${locale}`);
    }

    return data;
  } catch (error) {
    console.warn(`Failed to load ${locale}.jsonc, falling back to en.jsonc`);

    try {
      // 回退到英文版本
      const fallbackPath = join(process.cwd(), `src/i18n/pages/${name}/en.jsonc`);
      const fallbackContent = readFileSync(fallbackPath, "utf-8");
      const fallbackData = JSONC.parse(fallbackContent);

      if (!fallbackData) {
        throw new Error("Failed to parse fallback JSONC content");
      }

      return fallbackData;
    } catch (fallbackError) {
      console.error(`Failed to load fallback file: ${fallbackError}`);
      throw fallbackError;
    }
  }
}
