import { source } from '@/lib/source';
import { createFromSource } from 'fumadocs-core/search/server';

// For i18n support with multiple languages including Chinese,
// we need to use a language that works for both or handle them separately
// Orama doesn't natively support Chinese (zh), so we'll use 'english' for now
// which works reasonably well for CJK languages in keyword search
export const { GET } = createFromSource(source, {
  // https://docs.orama.com/docs/orama-js/supported-languages
  // Note: For full Chinese language support, consider using a different search solution
  // or implement custom tokenizers. For now, 'english' provides basic search functionality.
  language: 'english',
});
