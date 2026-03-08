import { ImageResponse } from 'next/og'

export const size = { width: 180, height: 180 }
export const contentType = 'image/png'

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 180,
          height: 180,
          borderRadius: 40,
          background: 'linear-gradient(135deg, #0D4F4F 0%, #0A3D3D 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
        }}
      >
        <span
          style={{
            fontSize: 120,
            fontWeight: 700,
            color: 'white',
            lineHeight: 1,
          }}
        >
          Q
        </span>
        <div
          style={{
            position: 'absolute',
            bottom: 32,
            right: 28,
            width: 24,
            height: 4,
            borderRadius: 2,
            background: '#C9946E',
            transform: 'rotate(-45deg)',
          }}
        />
      </div>
    ),
    { ...size }
  )
}
