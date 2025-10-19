import { defineI18n } from 'fumadocs-core/i18n';

// i18n configuration for Fumadocs
export const i18n = defineI18n({
  defaultLanguage: 'en',
  languages: ['en', 'zh'],
});

export type Locale = (typeof i18n.languages)[number];
