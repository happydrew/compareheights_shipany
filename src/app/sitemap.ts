import { MetadataRoute } from 'next'
import { locales, defaultLocale } from '@/i18n/locale'
import { getPostsByLocale, PostStatus } from '@/models/post'
import { getPublicProjects } from '@/models/project'
import { eq } from 'drizzle-orm'

const baseUrl = process.env.SITE_URL || 'https://compareheights.org'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const sitemap: MetadataRoute.Sitemap = []

  // 静态页面路由
  const staticRoutes = [
    { path: '', priority: 1.0, changeFrequency: 'daily' as const },
    { path: '/pricing', priority: 0.9, changeFrequency: 'weekly' as const },
    { path: '/about', priority: 0.8, changeFrequency: 'monthly' as const },
    { path: '/contact', priority: 0.7, changeFrequency: 'monthly' as const },
    { path: '/blog', priority: 0.9, changeFrequency: 'daily' as const },
  ]

  // 法律文档页面（这些在根路径下，不在 [locale] 下）
  const legalRoutes = [
    { path: '/privacy-policy', priority: 0.5, changeFrequency: 'monthly' as const },
    { path: '/terms-of-service', priority: 0.5, changeFrequency: 'monthly' as const },
  ]

  // 为每个语言生成静态路由
  for (const locale of locales) {
    for (const route of staticRoutes) {
      const path = locale === defaultLocale ? route.path : `/${locale}${route.path}`
      sitemap.push({
        url: `${baseUrl}${path || '/'}`,
        lastModified: new Date(),
        changeFrequency: route.changeFrequency,
        priority: route.priority,
      })
    }
  }

  // 添加法律文档页面（仅一次，不区分语言）
  for (const route of legalRoutes) {
    sitemap.push({
      url: `${baseUrl}${route.path}`,
      lastModified: new Date(),
      changeFrequency: route.changeFrequency,
      priority: route.priority,
    })
  }

  // 动态路由 - 博客文章
  try {
    for (const locale of locales) {
      const posts = await getPostsByLocale(locale, 1, 1000)

      if (posts && posts.length > 0) {
        for (const post of posts) {
          if (post.slug && post.status === PostStatus.Online) {
            const path = locale === defaultLocale
              ? `/blog/${post.slug}`
              : `/${locale}/blog/${post.slug}`

            sitemap.push({
              url: `${baseUrl}${path}`,
              lastModified: post.updated_at || post.created_at || new Date(),
              changeFrequency: 'weekly',
              priority: 0.7,
            })
          }
        }
      }
    }
  } catch (error) {
    console.error('Error fetching blog posts for sitemap:', error)
  }

  // 动态路由 - 公开项目
  try {
    const publicProjects = await getPublicProjects({ page: 1, limit: 1000 })

    if (publicProjects && publicProjects.length > 0) {
      for (const project of publicProjects) {
        for (const locale of locales) {
          const path = locale === defaultLocale
            ? `/share/project/${project.uuid}`
            : `/${locale}/share/project/${project.uuid}`

          sitemap.push({
            url: `${baseUrl}${path}`,
            lastModified: project.updated_at || project.created_at || new Date(),
            changeFrequency: 'weekly',
            priority: 0.6,
          })
        }
      }
    }
  } catch (error) {
    console.error('Error fetching public projects for sitemap:', error)
  }

  return sitemap
}
