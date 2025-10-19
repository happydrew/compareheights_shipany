import { DocsLayout } from 'fumadocs-ui/layouts/docs';
import { baseOptions } from '@/lib/layout.shared';
import { getPageTree, i18n } from '@/lib/source';
import { RootProvider } from 'fumadocs-ui/provider/next';
import { defineI18nUI } from 'fumadocs-ui/i18n';

const { provider } = defineI18nUI(i18n, {
  translations: {
    en: {
      displayName: 'English',
    },
    zh: {
      displayName: '中文',
      search: '搜索',
      toc: '目录',
      tocNoHeadings: '无标题',
      lastUpdate: '最后更新',
      chooseLanguage: '选择语言',
      nextPage: '下一页',
      previousPage: '上一页',
      chooseTheme: '选择主题',
      searchNoResult: '无结果',
    },
  },
});

// @ts-expect-error
export default async function Layout({ children, params }: LayoutProps<'/docs'>) {
  const { locale } = await params;
  const lang = (locale || i18n.defaultLanguage) as 'en' | 'zh';

  // Get page tree for current language
  const pageTree = getPageTree(lang);

  return (
    <RootProvider i18n={provider(lang)}>
      <DocsLayout tree={pageTree} {...baseOptions()}>
        {children}
      </DocsLayout>
    </RootProvider>
  );
}
