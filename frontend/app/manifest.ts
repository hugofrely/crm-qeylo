import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Qeylo CRM',
    short_name: 'Qeylo',
    description: 'CRM intelligent pour indépendants, PME et entreprises',
    start_url: '/fr',
    display: 'standalone',
    background_color: '#FAFAF7',
    theme_color: '#0D4F4F',
    icons: [
      {
        src: '/images/qeylo-logo-192.webp',
        sizes: '192x192',
        type: 'image/webp',
      },
      {
        src: '/images/qeylo-logo-512.webp',
        sizes: '512x512',
        type: 'image/webp',
      },
    ],
  }
}
