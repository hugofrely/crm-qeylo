# SEO & Favicon Design — Qeylo CRM

**Date:** 2026-03-08
**Approche:** SEO natif Next.js 16 (zéro dépendance externe)
**Cible:** Marché large (indépendants + PME + entreprises, FR et EN)

## 1. Favicon & Icônes

### Fichiers à créer

| Fichier | Format | Taille | Description |
|---------|--------|--------|-------------|
| `app/icon.svg` | SVG | vectoriel | Favicon SVG — lettre "Q" stylisée, teal `#0D4F4F` |
| `app/icon.tsx` | PNG (généré) | 32x32 | Favicon PNG via `ImageResponse` |
| `app/apple-icon.tsx` | PNG (généré) | 180x180 | Apple Touch Icon |
| `app/manifest.ts` | JSON | — | Web manifest (nom, couleurs, icônes) |

### Design de l'icône

- Lettre **"Q"** bold, arrondie
- SVG : couleur `#0D4F4F` sur fond transparent
- PNG/Apple icon : fond `#0D4F4F`, lettre blanche
- Le `favicon.ico` existant sera supprimé (remplacé par les nouvelles icônes)

## 2. Metadata & Open Graph

### Root layout (`app/layout.tsx`)

- `metadataBase` : URL de production
- `title.template` : `"%s | Qeylo CRM"`
- `openGraph` : type `website`, image par défaut, locale
- `twitter` : `card: "summary_large_image"`

### Layout locale (`app/[locale]/layout.tsx`)

- `generateMetadata` qui charge les traductions selon la locale
- Titre, description, OG tags traduits (fr/en)
- `alternates.languages` : liens hreflang vers l'autre locale + `x-default` → `/fr/`

### Pages marketing

- Chaque page (landing, features, pricing) aura `generateMetadata` avec titre/description spécifiques traduits
- Pages `"use client"` splitées : metadata côté serveur + composant client
- Traductions SEO ajoutées dans les fichiers `next-intl` sous clés `seo.*`

## 3. Images Open Graph

### Fichiers

| Fichier | Taille | Description |
|---------|--------|-------------|
| `app/[locale]/opengraph-image.tsx` | 1200x630 | Image OG par défaut |
| `app/[locale]/twitter-image.tsx` | 1200x630 | Image Twitter |

### Design

- Fond dégradé teal (`#0D4F4F` → plus clair)
- Logo "Q" en haut à gauche
- Titre de la page en blanc, grande police
- Sous-titre "Qeylo CRM" en accent warm (`#C9946E`)
- Texte adapté selon la locale (fr/en)

## 4. Sitemap, Robots.txt & Données structurées

### `app/sitemap.ts`

- Routes publiques listées en double : `/fr/...` et `/en/...`
- `changeFrequency` et `priority` par type de page
- `lastModified` : date du build

### `app/robots.ts`

- `allow: /` pour les pages publiques
- `disallow` : `/*/dashboard`, `/*/contacts`, `/*/deals`, `/*/settings`, etc.
- Référence vers le sitemap

### JSON-LD

- Composant `JsonLd` réutilisable dans le layout locale
- Schema **Organization** : nom, logo, URL, description
- Schema **WebSite** : nom, URL, SearchAction
- Injecté via `<script type="application/ld+json">`

### hreflang

- Via `alternates.languages` dans les metadata
- `{ "fr": "/fr/...", "en": "/en/..." }` + `x-default` → `/fr/`

## 5. Couleurs de référence

| Variable | Mode clair | Mode sombre |
|----------|-----------|-------------|
| Primary/Teal | `#0D4F4F` | `#3DD9D9` |
| Warm | `#C9946E` | `#D4A574` |
| Cream | `#FAFAF7` | `#111110` |

## 6. Traductions SEO à ajouter

```
seo.home.title: "CRM intelligent pour votre business" / "Smart CRM for your business"
seo.home.description: "Gérez vos contacts, deals et communications..." / "Manage your contacts, deals and communications..."
seo.features.ai.title: "Intelligence Artificielle" / "Artificial Intelligence"
seo.features.sales.title: "Gestion des ventes" / "Sales Management"
seo.pricing.title: "Tarifs" / "Pricing"
seo.og.siteName: "Qeylo CRM"
```
