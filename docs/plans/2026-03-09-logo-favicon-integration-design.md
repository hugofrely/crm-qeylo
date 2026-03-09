# Logo & Favicon Integration Design

**Date:** 2026-03-09
**Status:** Approved

## Goal

Replace placeholder icons (MessageSquare from lucide-react) with the real Qeylo logo (`qeylo-logo.png`) across the entire site, generate optimized WebP variants, and set up proper favicons.

## Source Asset

- `frontend/public/images/qeylo-logo.png` (~100KB, square, teal background with white "Q" and warm/orange tail)

## 1. Image Optimization

Convert the source PNG into optimized WebP files at multiple sizes:

| File | Size | Purpose |
|------|------|---------|
| `qeylo-logo-32.webp` | 32x32 | Favicon |
| `qeylo-logo-180.webp` | 180x180 | Apple touch icon |
| `qeylo-logo-192.webp` | 192x192 | PWA manifest |
| `qeylo-logo-512.webp` | 512x512 | PWA manifest |
| `qeylo-logo.webp` | original reduced | Site display |
| `favicon.ico` | 16x16 + 32x32 | Legacy browser favicon |

All generated files go in `frontend/public/images/`.

## 2. Logo Replacement (4 locations)

### Navbar (`components/landing/navbar.tsx`)
- Replace `MessageSquare` icon with `<Image src="/images/qeylo-logo.webp">` using `next/image`
- Keep "Qeylo" text next to logo
- Size: 36x36 with `rounded-xl`

### Footer (`components/landing/footer.tsx`)
- Same replacement as navbar
- Size: 40x40 with `rounded-xl`

### Sidebar (`components/Sidebar.tsx`)
- Replace `MessageSquare` icon in the brand section
- Size: 32x32 with `rounded-lg`

### Auth Layout (`app/[locale]/(auth)/layout.tsx`)
- Add logo image next to the "Qeylo" text on the decorative left panel
- Size: 48x48

## 3. Favicon Changes

- Delete dynamic generators: `app/icon.tsx`, `app/apple-icon.tsx`
- Keep or replace `app/icon.svg` with a link to the WebP/ICO
- Add static favicon files to `app/` directory following Next.js conventions
- Update `app/manifest.ts` to reference new icon paths

## 4. Out of Scope

- OG images (keep dynamic generation)
- Logo redesign or SVG conversion
