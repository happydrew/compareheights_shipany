import { source } from "@/lib/source";
import {
  DocsPage,
  DocsBody,
} from "fumadocs-ui/page";
import { notFound } from "next/navigation";
import { createRelativeLink } from "fumadocs-ui/mdx";
import { getMDXComponents } from "@/mdx-components";
import { DocHeader } from "@/components/docs/DocHeader";

export default async function DocsContentPage(props: {
  params: Promise<{ slug?: string[]; locale?: string }>;
}) {
  const params = await props.params;
  const page = source.getPage(params.slug, params.locale);

  if (!page) notFound();

  const MDXContent = page.data.body;

  // Access frontmatter data directly from page.data
  // Fumadocs automatically merges frontmatter into page.data
  const title = page.data.title || '';
  const description = page.data.description || '';
  const author = (page.data as any).author;
  const date = (page.data as any).date;

  console.log("page.data", page.data);

  return (
    <DocsPage
      toc={page.data.toc}
      full={page.data.full}
      tableOfContent={{
        style: "clerk",
        enabled: true,
      }}
    >
      <DocHeader
        title={title}
        description={description}
        author={author}
        date={date}
      />
      <DocsBody>
        <MDXContent
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
  return source.generateParams("slug", "locale");
}

export async function generateMetadata(props: {
  params: Promise<{ slug?: string[]; locale?: string }>;
}) {
  const params = await props.params;
  const page = source.getPage(params.slug, params.locale);
  if (!page) notFound();

  // Access frontmatter directly from page.data
  return {
    title: page.data.title || '',
    description: page.data.description || '',
  };
}
