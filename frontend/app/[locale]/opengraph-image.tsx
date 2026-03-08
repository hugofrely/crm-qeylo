import { ImageResponse } from 'next/og'
import { getTranslations } from 'next-intl/server'

export const alt = 'Qeylo CRM'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default async function OGImage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'seo.og' })

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          padding: '80px',
          background: 'linear-gradient(135deg, #0D4F4F 0%, #0A3D3D 60%, #072E2E 100%)',
          position: 'relative',
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: -100,
            right: -100,
            width: 400,
            height: 400,
            borderRadius: 200,
            background: 'rgba(201, 148, 110, 0.15)',
          }}
        />
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 72,
            height: 72,
            borderRadius: 18,
            background: 'rgba(255, 255, 255, 0.15)',
            marginBottom: 40,
          }}
        >
          <span style={{ fontSize: 44, fontWeight: 700, color: 'white' }}>Q</span>
        </div>
        <div
          style={{
            fontSize: 52,
            fontWeight: 700,
            color: 'white',
            lineHeight: 1.2,
            maxWidth: 800,
          }}
        >
          {t('imageTitle')}
        </div>
        <div
          style={{
            fontSize: 28,
            color: '#C9946E',
            marginTop: 16,
            fontWeight: 500,
          }}
        >
          {t('imageSubtitle')}
        </div>
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: 4,
            background: 'linear-gradient(90deg, #C9946E, #0D4F4F)',
          }}
        />
      </div>
    ),
    { ...size }
  )
}
