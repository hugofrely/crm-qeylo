# Logo & Favicon Integration Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace placeholder MessageSquare icons with the real Qeylo logo across the site, generate optimized WebP images, and set up proper favicons.

**Architecture:** Generate optimized WebP/ICO assets from the source PNG using ImageMagick/cwebp. Replace the lucide MessageSquare icon with `next/image` in navbar, footer, sidebar, and auth layout. Replace dynamic favicon generators with static files.

**Tech Stack:** ImageMagick, cwebp, Next.js 16 `next/image`, static favicon files

---

### Task 1: Generate Optimized Image Assets

**Files:**
- Source: `frontend/public/images/qeylo-logo.png`
- Create: `frontend/public/images/qeylo-logo.webp`
- Create: `frontend/public/images/qeylo-logo-32.webp`
- Create: `frontend/public/images/qeylo-logo-180.webp`
- Create: `frontend/public/images/qeylo-logo-192.webp`
- Create: `frontend/public/images/qeylo-logo-512.webp`
- Create: `frontend/app/favicon.ico`

**Step 1: Generate WebP variants**

```bash
cd frontend/public/images

# Full-size optimized WebP (max 200px for site display)
cwebp -q 85 -resize 200 200 qeylo-logo.png -o qeylo-logo.webp

# Favicon sizes
cwebp -q 90 -resize 32 32 qeylo-logo.png -o qeylo-logo-32.webp
cwebp -q 90 -resize 180 180 qeylo-logo.png -o qeylo-logo-180.webp
cwebp -q 90 -resize 192 192 qeylo-logo.png -o qeylo-logo-192.webp
cwebp -q 90 -resize 512 512 qeylo-logo.png -o qeylo-logo-512.webp
```

**Step 2: Generate favicon.ico**

```bash
cd frontend
magick public/images/qeylo-logo.png -resize 32x32 app/favicon.ico
```

**Step 3: Generate static PNG for apple-icon**

```bash
cd frontend
magick public/images/qeylo-logo.png -resize 180x180 app/apple-icon.png
```

**Step 4: Verify files exist and check sizes**

```bash
ls -la frontend/public/images/qeylo-logo*.webp
ls -la frontend/app/favicon.ico frontend/app/apple-icon.png
```

Expected: All files exist, WebP files significantly smaller than source PNG.

**Step 5: Commit**

```bash
git add frontend/public/images/qeylo-logo*.webp frontend/app/favicon.ico frontend/app/apple-icon.png
git commit -m "feat: generate optimized WebP logo variants and favicon"
```

---

### Task 2: Remove Dynamic Favicon Generators

**Files:**
- Delete: `frontend/app/icon.tsx`
- Delete: `frontend/app/icon.svg`
- Delete: `frontend/app/apple-icon.tsx`

**Step 1: Delete the dynamic generators**

```bash
rm frontend/app/icon.tsx frontend/app/icon.svg frontend/app/apple-icon.tsx
```

These are replaced by the static `favicon.ico` and `apple-icon.png` created in Task 1. Next.js automatically picks up `favicon.ico` and `apple-icon.png` from the `app/` directory.

**Step 2: Update manifest.ts**

Modify: `frontend/app/manifest.ts`

```ts
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
```

**Step 3: Commit**

```bash
git add -u frontend/app/icon.tsx frontend/app/icon.svg frontend/app/apple-icon.tsx
git add frontend/app/manifest.ts
git commit -m "feat: replace dynamic favicon generators with static assets"
```

---

### Task 3: Replace Logo in Navbar

**Files:**
- Modify: `frontend/components/landing/navbar.tsx`

**Step 1: Update imports**

Remove `MessageSquare` from lucide imports, add `Image` from `next/image`.

```tsx
import Image from "next/image"
```

Remove `MessageSquare` from the lucide import line (keep other icons).

**Step 2: Replace logo markup**

Find the logo `<Link>` block (around line 58-63):

```tsx
<Link href="/" className="flex items-center gap-2.5 group">
  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary transition-all group-hover:scale-105 group-hover:shadow-lg group-hover:shadow-primary/20">
    <MessageSquare className="h-4.5 w-4.5 text-primary-foreground" />
  </div>
  <span className="text-xl font-semibold tracking-tight">Qeylo</span>
</Link>
```

Replace with:

```tsx
<Link href="/" className="flex items-center gap-2.5 group">
  <Image
    src="/images/qeylo-logo.webp"
    alt="Qeylo"
    width={36}
    height={36}
    className="rounded-xl transition-all group-hover:scale-105 group-hover:shadow-lg group-hover:shadow-primary/20"
    priority
  />
  <span className="text-xl font-semibold tracking-tight">Qeylo</span>
</Link>
```

**Step 3: Verify build**

```bash
cd frontend && npx next build 2>&1 | tail -20
```

Expected: Build succeeds without errors.

**Step 4: Commit**

```bash
git add frontend/components/landing/navbar.tsx
git commit -m "feat: replace MessageSquare with real logo in navbar"
```

---

### Task 4: Replace Logo in Footer

**Files:**
- Modify: `frontend/components/landing/footer.tsx`

**Step 1: Update imports**

Remove `MessageSquare` import, add:

```tsx
import Image from "next/image"
```

**Step 2: Replace logo markup**

Find the brand column logo block (around line 43-49):

```tsx
<Link href="/" className="group flex items-center gap-2.5">
  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary transition-all group-hover:scale-105 group-hover:shadow-lg group-hover:shadow-primary/20">
    <MessageSquare className="h-5 w-5 text-primary-foreground" />
  </div>
  <span className="text-xl font-semibold tracking-tight">
    Qeylo
  </span>
</Link>
```

Replace with:

```tsx
<Link href="/" className="group flex items-center gap-2.5">
  <Image
    src="/images/qeylo-logo.webp"
    alt="Qeylo"
    width={40}
    height={40}
    className="rounded-xl transition-all group-hover:scale-105 group-hover:shadow-lg group-hover:shadow-primary/20"
  />
  <span className="text-xl font-semibold tracking-tight">
    Qeylo
  </span>
</Link>
```

**Step 3: Commit**

```bash
git add frontend/components/landing/footer.tsx
git commit -m "feat: replace MessageSquare with real logo in footer"
```

---

### Task 5: Replace Logo in Sidebar

**Files:**
- Modify: `frontend/components/Sidebar.tsx`

**Step 1: Update imports**

Add at the top:

```tsx
import Image from "next/image"
```

Remove `MessageSquare` from the lucide imports (it's still used for the chat nav item — check first! If `MessageSquare` is used elsewhere in the file, keep it in imports).

**Step 2: Replace brand section logo**

Find the brand section (around line 126-131):

```tsx
<div className="px-5 pt-5 pb-2 flex items-center gap-2.5">
  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--sidebar-primary)] shrink-0">
    <MessageSquare className="h-4 w-4 text-[var(--sidebar-primary-foreground)]" />
  </div>
  <span className="text-lg tracking-tight font-semibold text-[var(--sidebar-foreground)]">Qeylo</span>
</div>
```

Replace with:

```tsx
<div className="px-5 pt-5 pb-2 flex items-center gap-2.5">
  <Image
    src="/images/qeylo-logo.webp"
    alt="Qeylo"
    width={32}
    height={32}
    className="rounded-lg shrink-0"
  />
  <span className="text-lg tracking-tight font-semibold text-[var(--sidebar-foreground)]">Qeylo</span>
</div>
```

**Step 3: Commit**

```bash
git add frontend/components/Sidebar.tsx
git commit -m "feat: replace MessageSquare with real logo in sidebar"
```

---

### Task 6: Add Logo in Auth Layout

**Files:**
- Modify: `frontend/app/[locale]/(auth)/layout.tsx`

**Step 1: Add Image import**

```tsx
import Image from "next/image"
```

**Step 2: Replace the "Qeylo" heading with logo + text**

Find (around line 40-42):

```tsx
<h1 className="text-4xl tracking-tight" style={{ fontFamily: 'var(--font-display), Georgia, serif' }}>
  Qeylo
</h1>
```

Replace with:

```tsx
<div className="flex items-center gap-3">
  <Image
    src="/images/qeylo-logo.webp"
    alt="Qeylo"
    width={48}
    height={48}
    className="rounded-xl"
  />
  <h1 className="text-4xl tracking-tight" style={{ fontFamily: 'var(--font-display), Georgia, serif' }}>
    Qeylo
  </h1>
</div>
```

**Step 3: Commit**

```bash
git add frontend/app/[locale]/(auth)/layout.tsx
git commit -m "feat: add real logo to auth layout decorative panel"
```

---

### Task 7: Final Verification

**Step 1: Run full build**

```bash
cd frontend && npx next build 2>&1 | tail -30
```

Expected: Build succeeds with no errors.

**Step 2: Verify no remaining MessageSquare references in logo areas**

```bash
grep -n "MessageSquare" frontend/components/landing/navbar.tsx frontend/components/landing/footer.tsx
```

Expected: No matches (MessageSquare should be fully removed from these files).

**Step 3: Commit all together if any loose changes**

```bash
git status
```
