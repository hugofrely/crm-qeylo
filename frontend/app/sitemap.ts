import type { MetadataRoute } from 'next'
import { locales } from '@/i18n/config'

const BASE_URL = 'https://qeylo.com'

const publicRoutes = [
  { path: '', changeFrequency: 'weekly' as const, priority: 1.0 },
  { path: '/pricing', changeFrequency: 'monthly' as const, priority: 0.9 },
  { path: '/features', changeFrequency: 'monthly' as const, priority: 0.8 },
  { path: '/features/ai', changeFrequency: 'monthly' as const, priority: 0.7 },
  { path: '/features/sales', changeFrequency: 'monthly' as const, priority: 0.7 },
  { path: '/features/contacts', changeFrequency: 'monthly' as const, priority: 0.7 },
  { path: '/features/communication', changeFrequency: 'monthly' as const, priority: 0.7 },
  { path: '/features/productivity', changeFrequency: 'monthly' as const, priority: 0.7 },
  { path: '/cgu', changeFrequency: 'yearly' as const, priority: 0.3 },
  { path: '/confidentialite', changeFrequency: 'yearly' as const, priority: 0.3 },
  { path: '/mentions-legales', changeFrequency: 'yearly' as const, priority: 0.3 },
]

export default function sitemap(): MetadataRoute.Sitemap {
  const entries: MetadataRoute.Sitemap = []

  for (const route of publicRoutes) {
    for (const locale of locales) {
      entries.push({
        url: `${BASE_URL}/${locale}${route.path}`,
        lastModified: new Date(),
        changeFrequency: route.changeFrequency,
        priority: route.priority,
      })
    }
  }

  return entries
}
