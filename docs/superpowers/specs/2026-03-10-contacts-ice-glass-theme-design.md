# Contacts Page — Liquide-Glace Theme Prototype

## Overview

Create an isolated prototype page for the contacts list with a "liquide-glace" (ice-glass) visual theme. The page lives at a new route (`/contacts-prototype`) and does not modify the existing contacts page.

## Visual Direction

**Base style:** Deep Ocean (option D) merged with Arctic Crystal (option B) structured header and search bar.

### Key visual traits

- **Double-border:** Fine white/translucent outer border + wider inset border (via `box-shadow: inset`)
- **Glassmorphism opaque:** Semi-translucent layered backgrounds with backdrop-filter blur
- **Deep volume:** Multi-layer box-shadows (20px+ spread), subtle gradient meshes
- **Directional gradients:** 135-150deg gradients on containers, 90deg on hover states
- **Radial glow:** Subtle radial-gradient overlays for depth
- **CRM colors preserved:** Teal primary (`#0D4F4F` light / `#3DD9D9` dark) on buttons, badges, and interactive elements

### Light mode

- Background: Blue-ice translucent (`rgba(235, 245, 255, 0.97)` gradient)
- Borders: White outer (`rgba(255,255,255,0.85)`) + white inset (`rgba(255,255,255,0.5)`)
- Shadows: Soft blue-tinted (`rgba(13, 40, 70, 0.1)`)
- Text: Dark navy tones (`#1A2D3D`)
- Row hover: White glass with subtle shadow

### Dark mode

- Background: Deep ocean gradient (`rgba(8, 25, 50)` to `rgba(15, 35, 55)`)
- Borders: Blue-tinted outer (`rgba(100, 180, 255, 0.12)`) + blue inset (`rgba(100, 180, 255, 0.04)`)
- Shadows: Deep black (`rgba(0,0,0,0.6)`) + teal ambient glow
- Text: Ice blue tones (`#D0E4F2`)
- Row hover: Blue glass effect

## Page Structure

### Header section
- Page title "Contacts" (Instrument Serif) + contact count
- **"Actions ▾" dropdown button** (glass style): Import CSV, Export CSV, bulk actions
- **"+ Ajouter" primary button** (teal gradient): Opens create contact dialog

### Search bar
- Full-width search input below header (Arctic Crystal style)
- Glass background with blur, translucent border
- Search icon left-aligned

### Table
- **Column headers:** Nom, Entreprise, Score, Créé le (uppercase, small, muted)
- **Rows:** Avatar ring + name/job title | company | score dot + label | date
- Rows have rounded corners (12px), no visible border at rest, glass hover effect
- Sortable columns (reuse existing ordering logic)

### Pagination
- Reuse existing Pagination component (styled to match theme)

### Filters
- Reuse existing filter system from contacts page

## Technical Approach

- **New route:** `frontend/app/[locale]/(app)/contacts-prototype/page.tsx`
- **New component:** `frontend/components/contacts/ContactTableIceGlass.tsx`
- **Reuse:** All existing services, types, hooks, and shared filter components
- **Styling:** Tailwind utility classes + CSS variables scoped to the prototype page (no globals changes)
- **Theme support:** Uses existing `dark` class variant from the app's theme system
- **Fonts:** Same as app (DM Sans body, Instrument Serif display)

## Out of Scope

- Modifying the existing contacts page
- Changing global CSS variables or theme
- New backend endpoints
- Mobile-specific adaptations (desktop-first prototype)
