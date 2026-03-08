# Landing Page Redesign: Navbar + Feature Pages

## Overview

Redesign the landing page navbar with a mega menu and create 5 dedicated feature category pages. Add more contrast, color variety, and creativity while staying responsive.

## 1. New Navbar with Mega Menu

### Structure
- Logo Qeylo (left)
- Links: **Fonctionnalités** (mega menu trigger) | **Tarifs**
- CTAs: Login + "Commencer gratuitement" (right)

### Mega Menu
- Full-width glassmorphic dropdown on hover/click of "Fonctionnalités"
- 5-column grid (desktop), each column = one category:

| Category | Icon | Accent Color | Sub-items |
|----------|------|-------------|-----------|
| **Intelligence Artificielle** | Sparkles | `#0D4F4F` teal | Chat IA conversationnel |
| **Ventes & Pipeline** | TrendingUp | `#C9946E` warm | Pipeline, Deals, Funnel, Produits |
| **Contacts & Relations** | Users | `#3D7A7A` mid-teal | Contacts, Segments, Notes, Doublons, CSV |
| **Productivité** | Zap | `#8B5CF6` violet (new) | Tâches, Workflows, Rappels, Dashboard, Recherche |
| **Communication** | Mail | `#E5584A` coral (new) | Email Templates, Email Integration, Séquences |

- Each category: colored icon + title + short description + "Explorer →" link
- Entry animation: slide down + fade in
- Bottom link: "Voir toutes les fonctionnalités"
- Mobile: hamburger → accordion with 5 collapsible categories

### New Colors
- Violet: `#8B5CF6` (productivity)
- Coral: `#E5584A` (communication)
- These complement the existing teal + warm palette

## 2. Feature Category Pages

### Common Structure (all 5 pages)

**Hero:**
- Gradient background using category accent color
- Large decorative icon in background (low opacity)
- Colored badge with category name
- Display font title (Instrument Serif) with gradient keyword
- Short description
- 2 CTAs: "Commencer gratuitement" + "Voir une démo"

**Feature Sections:**
- Alternating left/right layout: text on one side, illustration/mockup on the other
- Each feature: icon, title, detailed description, bullet points with checkmarks
- Animated accent line separators between sections

**Stats Band:**
- Dark teal contrasting band with 3-4 large stats

**Final CTA:**
- Reuse existing CTA component, tinted with category accent color

### Page Identity

| Page | Route | Accent | Hero Gradient |
|------|-------|--------|---------------|
| IA | `/features/ai` | `#0D4F4F` | Teal → deep black |
| Ventes | `/features/sales` | `#C9946E` | Warm gold → cream |
| Contacts | `/features/contacts` | `#3D7A7A` | Mid-teal → blue-green |
| Productivité | `/features/productivity` | `#8B5CF6` | Violet → deep indigo |
| Communication | `/features/communication` | `#E5584A` | Coral → deep rose |

### Page Content

**IA (`/features/ai`)** — Flagship page, richest content
- Interactive AI chat demo (reuse AIDemo component)
- "What the AI can do" section
- Quote/testimonial section

**Ventes (`/features/sales`)**
- Visual pipeline (drag & drop)
- Deal management
- Analysis funnel
- Product catalog

**Contacts (`/features/contacts`)**
- Contact & company management
- Advanced segmentation
- Notes & history
- Duplicate detection
- CSV import

**Productivité (`/features/productivity`)**
- Tasks & calendar
- Automated workflows
- Smart reminders
- Dashboard & reports
- Global search

**Communication (`/features/communication`)**
- Email templates
- Email integration
- Automated sequences

### Creative Elements
- Alternating light/dark section backgrounds
- Colored decorative blobs with blur in background
- Dot grid overlay on dark sections
- Scroll animations: fade in up with stagger
- Cards with gradient borders using accent color
- Contrasting typography: Instrument Serif italic titles + DM Sans body

## 3. Landing Page Modifications

**Changes:**
- **Features section** → Becomes a compact "showcase": 5 clickable category cards linking to dedicated pages
  - Card IA: larger, spans 2 columns (featured)
  - 4 other cards: equal size
  - Each card: accent gradient background, icon, title, 2-3 bullets, "Découvrir →" button
  - Hover: elevation + accent border + subtle 3D rotation
- **Everything section** → Removed (content moved to dedicated pages)

**Unchanged:**
- Hero, AIDemo, HowItWorks, Pricing, CTA, Footer

## 4. i18n

All new text content must be added to both `messages/en/marketing.json` and `messages/fr/marketing.json` under appropriate keys:
- `navbar.megaMenu.*` for mega menu content
- `featuresAI.*`, `featuresSales.*`, `featuresContacts.*`, `featuresProductivity.*`, `featuresCommunication.*` for each page

## 5. Technical Notes

- Use `motion/react` for all animations (consistent with existing codebase)
- All pages must be fully responsive (mobile-first)
- Reuse existing shadcn/ui components where possible
- New routes under `(marketing)` route group
- Each feature page is a separate page component under `app/[locale]/(marketing)/features/[category]/page.tsx` or individual routes
