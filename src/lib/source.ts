import { docs } from '@/.source';
import { i18n } from './i18n.config';
import { type InferPageType, loader } from 'fumadocs-core/source';
import { lucideIconsPlugin } from 'fumadocs-core/source/lucide-icons';

// See https://fumadocs.dev/docs/headless/source-api for more info
export const source = loader({
  baseUrl: '/docs',
  source: docs.toFumadocsSource(),
  plugins: [lucideIconsPlugin()],

  // Add i18n configuration
  i18n,
});

// Get page tree for specific language
export function getPageTree(locale: string) {
  return source.pageTree[locale] || source.pageTree[i18n.defaultLanguage];
}

// Get page for specific language
export function getPage(slug: string[] | undefined, locale: string) {
  return source.getPage(slug, locale);
}

export function getPageImage(page: InferPageType<typeof source>) {
  const segments = [...page.slugs, 'image.png'];

  return {
    segments,
    url: `/og/docs/${segments.join('/')}`,
  };
}

export async function getLLMText(page: InferPageType<typeof source>) {
  const processed = await page.data.getText('processed');

  return `# ${page.data.title} (${page.url})

${processed}`;
}

// Export i18n config for use elsewhere
export { i18n };
