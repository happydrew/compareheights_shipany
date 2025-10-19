'use client';

import { useParams, usePathname } from 'next/navigation';
import { Languages } from 'lucide-react';
import { i18nConfig } from '@/lib/i18n.config';

const languageNames = {
  en: 'English',
  zh: '中文',
};

export function LanguageSwitcher() {
  const params = useParams();
  const pathname = usePathname();
  const currentLocale = (params?.locale as string) || i18nConfig.defaultLanguage;

  // Generate the path for switching language
  const getLanguagePath = (newLocale: string) => {
    // Replace the current locale in the pathname with the new locale
    const segments = pathname.split('/').filter(Boolean);

    // If the first segment is a locale, replace it
    if (i18nConfig.languages.includes(segments[0] as any)) {
      segments[0] = newLocale;
    } else {
      // If no locale in path, add it at the beginning
      segments.unshift(newLocale);
    }

    return '/' + segments.join('/');
  };

  return (
    <div className="flex items-center gap-2 px-3 py-2 border-t">
      <Languages className="w-4 h-4 text-muted-foreground" />
      <select
        value={currentLocale}
        onChange={(e) => {
          const newLocale = e.target.value;
          const newPath = getLanguagePath(newLocale);
          window.location.href = newPath;
        }}
        className="flex-1 bg-transparent border-0 text-sm cursor-pointer hover:text-foreground transition-colors focus:outline-none focus:ring-0"
        aria-label="Select language"
      >
        {i18nConfig.languages.map((lang) => (
          <option key={lang} value={lang}>
            {languageNames[lang]}
          </option>
        ))}
      </select>
    </div>
  );
}
