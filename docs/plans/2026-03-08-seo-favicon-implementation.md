# SEO & Favicon Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add comprehensive SEO (metadata, OG images, sitemap, robots.txt, JSON-LD, hreflang) and modern favicon/icons to Qeylo CRM.

**Architecture:** Use Next.js 16 native APIs exclusively — `Metadata`, `generateMetadata`, `ImageResponse`, `sitemap.ts`, `robots.ts`. Translations via existing `next-intl` setup. No external SEO libraries.

**Tech Stack:** Next.js 16, next-intl, ImageResponse (from `next/og`), TypeScript

---

### Task 1: Create SEO translation files

**Files:**
- Create: `frontend/messages/fr/seo.json`
- Create: `frontend/messages/en/seo.json`
- Modify: `frontend/i18n/request.ts` (add seo import)

**Step 1: Create French SEO translations**

Create `frontend/messages/fr/seo.json`:

```json
{
  "siteName": "Qeylo CRM",
  "home": {
    "title": "CRM intelligent pour indépendants, PME et entreprises",
    "description": "Gérez vos contacts, deals, tâches et communications avec un CRM intelligent propulsé par l'IA. Essai gratuit."
  },
  "pricing": {
    "title": "Tarifs",
    "description": "Découvrez nos offres Solo, Pro et Équipe. CRM gratuit pour les indépendants, plans avancés pour les PME."
  },
  "features": {
    "title": "Fonctionnalités",
    "description": "Découvrez toutes les fonctionnalités de Qeylo CRM : gestion des contacts, pipeline de ventes, IA, productivité et plus.",
    "ai": {
      "title": "Intelligence Artificielle",
      "description": "Un assistant IA intégré qui analyse vos données, suggère des actions et automatise vos tâches commerciales."
    },
    "sales": {
      "title": "Gestion des ventes",
      "description": "Pipeline visuel, suivi des deals, prévisions de revenus et outils de conversion pour booster vos ventes."
    },
    "contacts": {
      "title": "Gestion des contacts",
      "description": "Centralisez et enrichissez vos contacts, segmentez vos audiences et suivez chaque interaction."
    },
    "communication": {
      "title": "Communication",
      "description": "Email intégré, modèles personnalisables et séquences automatisées pour communiquer efficacement."
    },
    "productivity": {
      "title": "Productivité",
      "description": "Tâches, calendrier, workflows automatisés et outils de collaboration pour gagner en efficacité."
    }
  },
  "og": {
    "imageTitle": "Qeylo CRM",
    "imageSubtitle": "CRM intelligent propulsé par l'IA"
  }
}
```

**Step 2: Create English SEO translations**

Create `frontend/messages/en/seo.json`:

```json
{
  "siteName": "Qeylo CRM",
  "home": {
    "title": "Smart CRM for freelancers, SMBs, and enterprises",
    "description": "Manage your contacts, deals, tasks, and communications with an AI-powered smart CRM. Free trial available."
  },
  "pricing": {
    "title": "Pricing",
    "description": "Explore our Solo, Pro, and Team plans. Free CRM for freelancers, advanced plans for growing businesses."
  },
  "features": {
    "title": "Features",
    "description": "Discover all Qeylo CRM features: contact management, sales pipeline, AI, productivity tools, and more.",
    "ai": {
      "title": "Artificial Intelligence",
      "description": "A built-in AI assistant that analyzes your data, suggests actions, and automates your sales tasks."
    },
    "sales": {
      "title": "Sales Management",
      "description": "Visual pipeline, deal tracking, revenue forecasts, and conversion tools to boost your sales."
    },
    "contacts": {
      "title": "Contact Management",
      "description": "Centralize and enrich your contacts, segment audiences, and track every interaction."
    },
    "communication": {
      "title": "Communication",
      "description": "Integrated email, customizable templates, and automated sequences for effective communication."
    },
    "productivity": {
      "title": "Productivity",
      "description": "Tasks, calendar, automated workflows, and collaboration tools to boost efficiency."
    }
  },
  "og": {
    "imageTitle": "Qeylo CRM",
    "imageSubtitle": "AI-powered smart CRM"
  }
}
```

**Step 3: Add SEO import to i18n request config**

Modify `frontend/i18n/request.ts` — add after line 28 (notifications import):

```typescript
const seo = (await import(`@/messages/${locale}/seo.json`)).default;
```

And add `seo` to the messages object in the return statement.

**Step 4: Commit**

```bash
git add frontend/messages/fr/seo.json frontend/messages/en/seo.json frontend/i18n/request.ts
git commit -m "feat(seo): add SEO translation files for fr and en"
```

---

### Task 2: Create favicon SVG icon

**Files:**
- Create: `frontend/app/icon.svg`
- Delete: `frontend/app/favicon.ico`

**Step 1: Create the SVG favicon**

Create `frontend/app/icon.svg` — a stylized "Q" letter in teal `#0D4F4F`:

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" fill="none">
  <rect width="32" height="32" rx="8" fill="#0D4F4F"/>
  <text x="16" y="23" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-weight="700" font-size="22" fill="white">Q</text>
  <line x1="19" y1="20" x2="24" y2="26" stroke="#C9946E" stroke-width="2.5" stroke-linecap="round"/>
</svg>
```

**Step 2: Delete old favicon.ico**

```bash
rm frontend/app/favicon.ico
```

**Step 3: Commit**

```bash
git add frontend/app/icon.svg
git rm frontend/app/favicon.ico
git commit -m "feat(favicon): replace favicon.ico with SVG icon"
```

---

### Task 3: Create generated PNG icon and Apple Touch Icon

**Files:**
- Create: `frontend/app/icon.tsx`
- Create: `frontend/app/apple-icon.tsx`

**Step 1: Create the PNG icon generator**

Create `frontend/app/icon.tsx`:

```tsx
import { ImageResponse } from 'next/og'

export const size = { width: 32, height: 32 }
export const contentType = 'image/png'

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 32,
          height: 32,
          borderRadius: 8,
          background: '#0D4F4F',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
        }}
      >
        <span
          style={{
            fontSize: 22,
            fontWeight: 700,
            color: 'white',
            lineHeight: 1,
          }}
        >
          Q
        </span>
      </div>
    ),
    { ...size }
  )
}
```

**Step 2: Create the Apple Touch Icon generator**

Create `frontend/app/apple-icon.tsx`:

```tsx
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
```

**Step 3: Commit**

```bash
git add frontend/app/icon.tsx frontend/app/apple-icon.tsx
git commit -m "feat(favicon): add generated PNG icon and Apple Touch Icon"
```

---

### Task 4: Create web manifest

**Files:**
- Create: `frontend/app/manifest.ts`

**Step 1: Create the manifest**

Create `frontend/app/manifest.ts`:

```typescript
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
```

**Step 2: Commit**

```bash
git add frontend/app/manifest.ts
git commit -m "feat(pwa): add web manifest with theme colors"
```

---

### Task 5: Update root layout metadata

**Files:**
- Modify: `frontend/app/layout.tsx`

**Step 1: Update the root metadata**

Replace the existing `metadata` export in `frontend/app/layout.tsx` (lines 33-36) with:

```typescript
export const metadata: Metadata = {
  metadataBase: new URL('https://qeylo.com'),
  title: {
    default: 'Qeylo CRM',
    template: '%s | Qeylo CRM',
  },
  description: 'CRM intelligent pour indépendants, PME et entreprises',
  openGraph: {
    type: 'website',
    siteName: 'Qeylo CRM',
  },
  twitter: {
    card: 'summary_large_image',
  },
}
```

**Step 2: Verify the app builds**

```bash
cd frontend && npm run build
```

Expected: Build succeeds without errors.

**Step 3: Commit**

```bash
git add frontend/app/layout.tsx
git commit -m "feat(seo): add metadataBase, title template, OG and Twitter config"
```

---

### Task 6: Add generateMetadata to locale layout

**Files:**
- Modify: `frontend/app/[locale]/layout.tsx`

**Step 1: Add generateMetadata export**

Add these imports at the top of `frontend/app/[locale]/layout.tsx`:

```typescript
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { locales, defaultLocale } from '@/i18n/config';
```

Add this function before the `LocaleLayout` component:

```typescript
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'seo' });

  const languages: Record<string, string> = {};
  for (const loc of locales) {
    languages[loc] = `/${loc}`;
  }
  languages['x-default'] = `/${defaultLocale}`;

  return {
    title: t('home.title'),
    description: t('home.description'),
    openGraph: {
      title: t('home.title'),
      description: t('home.description'),
      locale: locale === 'fr' ? 'fr_FR' : 'en_US',
      siteName: t('siteName'),
    },
    twitter: {
      title: t('home.title'),
      description: t('home.description'),
    },
    alternates: {
      languages,
    },
  };
}
```

**Step 2: Verify build**

```bash
cd frontend && npm run build
```

**Step 3: Commit**

```bash
git add frontend/app/\[locale\]/layout.tsx
git commit -m "feat(seo): add generateMetadata with i18n and hreflang to locale layout"
```

---

### Task 7: Add metadata to marketing pages

**Files:**
- Modify: `frontend/app/[locale]/page.tsx` (home)
- Modify: `frontend/app/[locale]/(marketing)/pricing/page.tsx`
- Modify: `frontend/app/[locale]/(marketing)/features/ai/page.tsx`
- Modify: `frontend/app/[locale]/(marketing)/features/sales/page.tsx`
- Modify: `frontend/app/[locale]/(marketing)/features/contacts/page.tsx`
- Modify: `frontend/app/[locale]/(marketing)/features/communication/page.tsx`
- Modify: `frontend/app/[locale]/(marketing)/features/productivity/page.tsx`
- Modify: `frontend/app/[locale]/(marketing)/features/page.tsx`

**Strategy:** Since all these pages are `"use client"`, we cannot add `generateMetadata` directly. Instead, create a separate `metadata.ts` file pattern won't work either in Next.js. The correct approach is to split each page into a server wrapper + client component.

**Step 1: Refactor home page**

Rename `frontend/app/[locale]/page.tsx` content into a new client component `frontend/components/landing/home-page.tsx`:

```tsx
"use client"

import { useAuth } from "@/lib/auth"
import { Navbar } from "@/components/landing/navbar"
import { Hero } from "@/components/landing/hero"
import { AIDemo } from "@/components/landing/ai-demo"
import { FeaturesShowcase } from "@/components/landing/features-showcase"
import { HowItWorks } from "@/components/landing/how-it-works"
import { Pricing } from "@/components/landing/pricing"
import { CTA } from "@/components/landing/cta"
import { Footer } from "@/components/landing/footer"
import { useTranslations } from "next-intl"

export default function HomePage() {
  const { loading } = useAuth()
  const t = useTranslations("common")

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-muted-foreground">{t("loading")}</div>
      </div>
    )
  }

  return (
    <>
      <Navbar />
      <main>
        <Hero />
        <AIDemo />
        <FeaturesShowcase />
        <HowItWorks />
        <Pricing />
        <CTA />
      </main>
      <Footer />
    </>
  )
}
```

Then rewrite `frontend/app/[locale]/page.tsx` as a server component:

```tsx
import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'
import { locales, defaultLocale } from '@/i18n/config'
import HomePage from '@/components/landing/home-page'

type Props = {
  params: Promise<{ locale: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'seo' })

  const languages: Record<string, string> = {}
  for (const loc of locales) {
    languages[loc] = `/${loc}`
  }
  languages['x-default'] = `/${defaultLocale}`

  return {
    title: t('home.title'),
    description: t('home.description'),
    alternates: { languages },
  }
}

export default function Page() {
  return <HomePage />
}
```

**Step 2: Refactor pricing page**

Same pattern: move client code to `frontend/components/landing/pricing-page.tsx`, rewrite `frontend/app/[locale]/(marketing)/pricing/page.tsx` as server wrapper with:

```tsx
import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'
import { locales, defaultLocale } from '@/i18n/config'
import PricingPage from '@/components/landing/pricing-page'

type Props = {
  params: Promise<{ locale: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'seo' })

  const languages: Record<string, string> = {}
  for (const loc of locales) {
    languages[loc] = `/${loc}/pricing`
  }
  languages['x-default'] = `/${defaultLocale}/pricing`

  return {
    title: t('pricing.title'),
    description: t('pricing.description'),
    alternates: { languages },
  }
}

export default function Page() {
  return <PricingPage />
}
```

**Step 3: Refactor feature pages (ai, sales, contacts, communication, productivity)**

Each feature page follows the same pattern. The client component already exists in `FeatureCategoryPage`. Rewrite each `page.tsx` as:

```tsx
import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'
import { locales, defaultLocale } from '@/i18n/config'
import FeaturePageClient from './client'

type Props = {
  params: Promise<{ locale: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'seo' })
  const slug = 'ai' // change per page: 'sales', 'contacts', 'communication', 'productivity'

  const languages: Record<string, string> = {}
  for (const loc of locales) {
    languages[loc] = `/${loc}/features/${slug}`
  }
  languages['x-default'] = `/${defaultLocale}/features/${slug}`

  return {
    title: t(`features.${slug}.title`),
    description: t(`features.${slug}.description`),
    alternates: { languages },
  }
}

export default function Page() {
  return <FeaturePageClient />
}
```

And create a `client.tsx` next to each `page.tsx` with the original `"use client"` code.

**Step 4: Refactor features index page**

Same pattern for `frontend/app/[locale]/(marketing)/features/page.tsx`.

**Step 5: Verify build**

```bash
cd frontend && npm run build
```

**Step 6: Commit**

```bash
git add frontend/app frontend/components/landing/home-page.tsx frontend/components/landing/pricing-page.tsx
git commit -m "feat(seo): add per-page generateMetadata to all marketing pages"
```

---

### Task 8: Create Open Graph image generator

**Files:**
- Create: `frontend/app/[locale]/opengraph-image.tsx`
- Create: `frontend/app/[locale]/twitter-image.tsx`

**Step 1: Create OG image generator**

Create `frontend/app/[locale]/opengraph-image.tsx`:

```tsx
import { ImageResponse } from 'next/og'
import { getTranslations } from 'next-intl/server'

export const alt = 'Qeylo CRM'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default async function OGImage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'seo' })

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
        {/* Decorative circle */}
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
        {/* Logo Q */}
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
        {/* Title */}
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
        {/* Subtitle */}
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
        {/* Bottom accent line */}
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
```

**Step 2: Create Twitter image (re-export)**

Create `frontend/app/[locale]/twitter-image.tsx`:

```tsx
export { default, alt, size, contentType } from './opengraph-image'
```

**Step 3: Commit**

```bash
git add frontend/app/\[locale\]/opengraph-image.tsx frontend/app/\[locale\]/twitter-image.tsx
git commit -m "feat(seo): add dynamic OG and Twitter image generation"
```

---

### Task 9: Create sitemap.ts

**Files:**
- Create: `frontend/app/sitemap.ts`

**Step 1: Create the sitemap**

Create `frontend/app/sitemap.ts`:

```typescript
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
```

**Step 2: Commit**

```bash
git add frontend/app/sitemap.ts
git commit -m "feat(seo): add auto-generated sitemap.ts"
```

---

### Task 10: Create robots.ts

**Files:**
- Create: `frontend/app/robots.ts`

**Step 1: Create robots.ts**

Create `frontend/app/robots.ts`:

```typescript
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
```

**Step 2: Commit**

```bash
git add frontend/app/robots.ts
git commit -m "feat(seo): add robots.ts with sitemap reference"
```

---

### Task 11: Add JSON-LD structured data

**Files:**
- Create: `frontend/components/seo/json-ld.tsx`
- Modify: `frontend/app/[locale]/layout.tsx` (add JsonLd component)

**Step 1: Create JsonLd component**

Create `frontend/components/seo/json-ld.tsx`:

```tsx
import { getTranslations } from 'next-intl/server'

export async function JsonLd({ locale }: { locale: string }) {
  const t = await getTranslations({ locale, namespace: 'seo' })

  const organizationSchema = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'Qeylo',
    url: 'https://qeylo.com',
    logo: 'https://qeylo.com/icon',
    description: t('home.description'),
    sameAs: [],
  }

  const websiteSchema = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: t('siteName'),
    url: 'https://qeylo.com',
    inLanguage: locale === 'fr' ? 'fr-FR' : 'en-US',
  }

  const softwareSchema = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'Qeylo CRM',
    applicationCategory: 'BusinessApplication',
    operatingSystem: 'Web',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'EUR',
    },
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareSchema) }}
      />
    </>
  )
}
```

**Step 2: Add JsonLd to locale layout**

Modify `frontend/app/[locale]/layout.tsx` — import and add the component:

```typescript
import { JsonLd } from '@/components/seo/json-ld';
```

Add `<JsonLd locale={locale} />` inside the return JSX, before `{children}`.

**Step 3: Commit**

```bash
git add frontend/components/seo/json-ld.tsx frontend/app/\[locale\]/layout.tsx
git commit -m "feat(seo): add JSON-LD structured data (Organization, WebSite, SoftwareApplication)"
```

---

### Task 12: Final build verification

**Step 1: Run full build**

```bash
cd frontend && npm run build
```

Expected: Build succeeds.

**Step 2: Run dev server and check**

```bash
cd frontend && npm run dev
```

Manually verify:
- Visit `http://localhost:3000/fr` — check page source for meta tags, OG tags, hreflang
- Visit `http://localhost:3000/en` — check translated meta tags
- Visit `http://localhost:3000/sitemap.xml` — verify sitemap renders
- Visit `http://localhost:3000/robots.txt` — verify robots.txt renders
- Visit `http://localhost:3000/icon` — verify favicon renders
- Visit `http://localhost:3000/apple-icon` — verify apple icon renders
- Check page source for JSON-LD scripts

**Step 3: Final commit if any fixes needed**
