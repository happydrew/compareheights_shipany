import "@/app/globals.css";

import { getLocale, setRequestLocale } from "next-intl/server";
import { locales } from "@/i18n/locale";
// import { RootProvider } from 'fumadocs-ui/provider/next';


export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getLocale();
  setRequestLocale(locale);

  const webUrl = process.env.NEXT_PUBLIC_WEB_URL || "";
  const googleAdsenseCode = process.env.NEXT_PUBLIC_GOOGLE_ADCODE;

  return (
    <html lang={locale} suppressHydrationWarning>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <link rel="icon" href="/favicon.ico" />

        {/* Google Adsense */}
        {process.env.NODE_ENV == "production" && googleAdsenseCode && (
          <>
            <script
              async
              src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${googleAdsenseCode}`}
              crossOrigin="anonymous"
            ></script>
            <meta name="google-adsense-account" content={`${googleAdsenseCode}`} />
          </>
        )}

        {locales &&
          locales.map((loc) => (
            <link
              key={loc}
              rel="alternate"
              hrefLang={loc}
              href={`${webUrl}${loc === "en" ? "" : `/${loc}`}/`}
            />
          ))}
        <link rel="alternate" hrefLang="x-default" href={webUrl} />

        {/* 结构化数据 - 从旧项目 theme.config.tsx 迁移 */}
        {/* LocalBusiness Schema */}
        <script type="application/ld+json">
          {`
            {
              "@context": "https://schema.org",
              "@type": "LocalBusiness",
              "name": "CompareHeights",
              "image": "https://compareheights.org/favicon.png",
              "@id": "",
              "url": "https://compareheights.org",
              "telephone": "(907) 457-2631",
              "priceRange": "$",
              "address": {
                "@type": "PostalAddress",
                "streetAddress": "919 Stimple Ct",
                "addressLocality": "Fairbanks",
                "addressRegion": "AK",
                "postalCode": "99712",
                "addressCountry": "US"
              },
              "openingHoursSpecification": {
                "@type": "OpeningHoursSpecification",
                "dayOfWeek": [
                  "Monday",
                  "Tuesday",
                  "Wednesday",
                  "Thursday",
                  "Friday",
                  "Saturday",
                  "Sunday"
                ],
                "opens": "00:00",
                "closes": "23:59"
              },
              "sameAs": []
            }
          `}
        </script>

        {/* BreadcrumbList Schema */}
        <script type="application/ld+json">
          {`
            {
              "@context": "https://schema.org",
              "@type": "BreadcrumbList",
              "itemListElement": [
                {
                  "@type": "ListItem",
                  "position": 1,
                  "name": "CompareHeights",
                  "item": "https://compareheights.org/"
                },
                {
                  "@type": "ListItem",
                  "position": 2,
                  "name": "Privacy Policy",
                  "item": "https://compareheights.org/privacy-policy/"
                }
              ]
            }
          `}
        </script>

        {/* WebSite Schema */}
        <script type="application/ld+json">
          {`
            {
              "@context": "https://schema.org",
              "@type": "WebSite",
              "name": "CompareHeights",
              "alternateName": "Comparing Heights, Height Comparison, Height Comparison Tool, Height Comparison Online",
              "url": "https://compareheights.org",
              "potentialAction": {
                "@type": "SearchAction",
                "target": "https://compareheights.org",
                "query-input": "required name=search_term_string"
              }
            }
          `}
        </script>
      </head>
      <body>
        {children}
      </body>
    </html>
  );
}
