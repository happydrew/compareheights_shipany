import type { BaseLayoutProps } from 'fumadocs-ui/layouts/shared';
import { i18n } from './i18n.config';

/**
 * Shared layout configurations
 *
 * you can customise layouts individually from:
 * Home Layout: app/(home)/layout.tsx
 * Docs Layout: app/docs/layout.tsx
 */
export function baseOptions(locale?: string): BaseLayoutProps {
  return {
    nav: {
      title: (
        <div className='flex items-center justify-center gap-1'>
          <img src="/favicon.ico" alt="CompareHeights" className='w-6 h-6' />
          CompareHeights
        </div>
      ),
    },

    // see https://fumadocs.dev/docs/ui/navigation/links
    links: [],

    // i18n configuration for language switcher
    i18n,
  };
}
