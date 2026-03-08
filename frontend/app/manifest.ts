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
        src: '/icon',
        sizes: '32x32',
        type: 'image/png',
      },
      {
        src: '/apple-icon',
        sizes: '180x180',
        type: 'image/png',
      },
    ],
  }
}
