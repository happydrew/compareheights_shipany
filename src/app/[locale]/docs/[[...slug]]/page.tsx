import { getPageImage, getPage, i18n, source } from '@/lib/source';
import {
  DocsBody,
  DocsDescription,
  DocsPage,
  DocsTitle,
} from 'fumadocs-ui/page';
import { notFound } from 'next/navigation';
import { getMDXComponents } from '@/mdx-components';
import type { Metadata } from 'next';
import { createRelativeLink } from 'fumadocs-ui/mdx';

interface PageProps {
  params: Promise<{
    locale: string;
    slug?: string[];
  }>;
}

export default async function Page(props: PageProps) {
  const params = await props.params;
  const locale = params.locale || i18n.defaultLanguage;
  const slug = params.slug;

  // Get page for current language
  const page = getPage(slug, locale);
  if (!page) notFound();

  const MDX = page.data.body;

  return (
    <DocsPage toc={page.data.toc} full={page.data.full}>
      <DocsTitle>{page.data.title}</DocsTitle>
      <DocsDescription>{page.data.description}</DocsDescription>
      <DocsBody>
        <MDX
          components={getMDXComponents({
            // this allows you to link to other pages with relative file paths
            a: createRelativeLink(source, page),
          })}
        />
      </DocsBody>
    </DocsPage>
  );
}

export async function generateStaticParams() {
  const params: { locale: string; slug?: string[] }[] = [];

  // Generate static paths for each language
  for (const lang of i18n.languages) {
    const langPages = source.getPages(lang);
    params.push(
      ...langPages.map((page) => ({
        locale: lang,
        slug: page.slugs,
      }))
    );
  }

  return params;
}

export async function generateMetadata(
  props: PageProps,
): Promise<Metadata> {
  const params = await props.params;
  const locale = params.locale || i18n.defaultLanguage;
  const slug = params.slug;

  const page = getPage(slug, locale);
  if (!page) notFound();

  const slugPath = slug?.join('/') || '';

  return {
    title: page.data.title,
    description: page.data.description,
    openGraph: {
      images: getPageImage(page).url,
    },
    // Add language information for SEO
    alternates: {
      languages: {
        'en': `/en/docs/${slugPath}`,
        'zh': `/zh/docs/${slugPath}`,
      },
    },
  };
}
