import { PostStatus, findPostBySlug } from "@/models/post";

import BlogDetail from "@/components/blocks/blog-detail";
import Empty from "@/components/blocks/empty";
import { Post } from "@/types/post";
import { siteConfig, getAbsoluteUrl } from "@/config/metadata";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  const post = await findPostBySlug(slug, locale);

  const canonicalUrl = locale !== "en"
    ? `${siteConfig.url}/${locale}/blog/${slug}`
    : `${siteConfig.url}/blog/${slug}`;

  // 如果文章有封面图，覆盖默认 OG 图片
  const ogImage = post?.cover_url ? getAbsoluteUrl(post.cover_url) : undefined;

  return {
    // 只定义页面特有的 title 和 description，会自动传递给 openGraph 和 twitter
    title: post?.title || "",
    description: post?.description || "",
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      url: canonicalUrl,
      type: 'article', // 覆盖父布局的 'website'
      // 只有当文章有封面图时才覆盖 images
      ...(ogImage && {
        images: [{
          url: ogImage,
        }],
      }),
    },
  };
}

export default async function ({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  const post = await findPostBySlug(slug, locale);

  if (!post || post.status !== PostStatus.Online) {
    return <Empty message="Post not found" />;
  }

  return <BlogDetail post={post as unknown as Post} />;
}
