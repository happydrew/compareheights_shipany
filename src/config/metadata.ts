// 网站核心配置 - 从旧项目 theme.config.tsx 迁移
export const siteConfig = {
  name: "CompareHeights",
  url: process.env.NEXT_PUBLIC_WEB_URL || "https://compareheights.org",
  defaultOgImage: "/og-image.webp",
  twitterHandle: "@compareheights",
};

// 构造完整的绝对 URL
export const getAbsoluteUrl = (path: string): string => {
  if (path.startsWith("http://") || path.startsWith("https://")) {
    return path;
  }
  const base = siteConfig.url.replace(/\/$/, "");
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  return `${base}${cleanPath}`;
};
