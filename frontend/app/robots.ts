import type { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/*/dashboard',
          '/*/contacts',
          '/*/deals',
          '/*/tasks',
          '/*/calendar',
          '/*/chat',
          '/*/inbox',
          '/*/settings',
          '/*/pipeline',
          '/*/companies',
          '/*/segments',
          '/*/products',
          '/*/workflows',
          '/*/sequences',
          '/*/reports',
          '/*/trash',
        ],
      },
    ],
    sitemap: 'https://qeylo.com/sitemap.xml',
  }
}
