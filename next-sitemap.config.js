/** @type {import('next-sitemap').IConfig} */
module.exports = {
  siteUrl: process.env.SITE_URL || 'https://nanoedit.art',
  generateRobotsTxt: true,
  exclude: ['/api/*', '/console/*', '/auth/*', '/admin/*', '/*/*/console/*', '/*/*/auth/*', '/*/*/api/*', '/*/*/admin/*'],
  generateIndexSitemap: false,
  changefreq: 'daily',
  priority: 0.7,
  autoLastmod: true,

  // Transform function to handle dynamic routes
  transform: async (config, path) => {
    // Handle locale-based routes
    if (path === '/[locale]') {
      return [
        {
          loc: '/',
          changefreq: config.changefreq,
          priority: config.priority,
          lastmod: new Date().toISOString(),
        },
        {
          loc: '/zh',
          changefreq: config.changefreq,
          priority: config.priority,
          lastmod: new Date().toISOString(),
        }
      ];
    }

    if (path === '/[locale]/pricing') {
      return [
        {
          loc: '/pricing',
          changefreq: config.changefreq,
          priority: config.priority,
          lastmod: new Date().toISOString(),
        },
        {
          loc: '/zh/pricing',
          changefreq: config.changefreq,
          priority: config.priority,
          lastmod: new Date().toISOString(),
        }
      ];
    }

    // Handle other locale-specific pages
    if (path.startsWith('/[locale]/')) {
      const cleanPath = path.replace('/[locale]', '');
      return [
        {
          loc: cleanPath,
          changefreq: config.changefreq,
          priority: config.priority,
          lastmod: new Date().toISOString(),
        },
        {
          loc: `/zh${cleanPath}`,
          changefreq: config.changefreq,
          priority: config.priority,
          lastmod: new Date().toISOString(),
        }
      ];
    }

    // Default transformation
    return {
      loc: path,
      changefreq: config.changefreq,
      priority: config.priority,
      lastmod: new Date().toISOString(),
    };
  },

  robotsTxtOptions: {
    policies: [
      {
        userAgent: '*',
        allow: '/',
      },
      {
        userAgent: '*',
        disallow: ['/console/', '/api/', '/auth/', '/admin/'],
      },
    ],
    additionalSitemaps: [
      `${process.env.SITE_URL || 'https://nanoedit.art'}/sitemap.xml`,
    ],
  },
}