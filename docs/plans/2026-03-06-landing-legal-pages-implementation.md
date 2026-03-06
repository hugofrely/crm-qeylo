# Landing Page Update + Legal Pages — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Update landing page with current CRM features, update pricing with comparison grid, create 3 legal pages, fix footer links.

**Architecture:** Edit existing landing components (hero, features, pricing), add a new "everything" section component, create 3 new pages under `(marketing)/`, update footer links.

**Tech Stack:** Next.js App Router, React, Tailwind CSS, motion/react (framer-motion), lucide-react icons, shadcn/ui Button component.

---

## Task 1: Update Hero subtitle

**Files:**
- Modify: `frontend/components/landing/hero.tsx:49-57`

**Step 1: Update the hero description text**

In `hero.tsx`, replace the `<motion.p>` content (line 53-57) with:

```tsx
Le CRM qui comprend ce que vous dites. Contacts, deals, taches,
automations, rapports — Qeylo gere tout depuis une simple
conversation. Zero formulaire. Zero friction.
```

**Step 2: Verify visually**

Run: `cd frontend && npm run dev`
Check: Homepage hero shows updated text.

**Step 3: Commit**

```bash
git add frontend/components/landing/hero.tsx
git commit -m "feat(landing): update hero subtitle with full feature scope"
```

---

## Task 2: Update Features section (6 cards)

**Files:**
- Modify: `frontend/components/landing/features.tsx`

**Step 1: Update the features array**

Replace the `features` array with updated entries. Keep the same structure (icon, illustration, title, description, color, bgColor). The 6 features become:

1. **Chat IA** (MessageSquare) — unchanged concept, update description to mention 9+ tools
2. **Contacts & Segments** (Users) — contacts + segments dynamiques + detection doublons + enrichissement
3. **Pipeline & Deals** (KanbanSquare) — multi-pipeline, Kanban drag-drop, entonnoir de conversion
4. **Taches & Rappels** (CheckSquare) — assignation equipe, vue calendrier, rappels automatiques
5. **Workflows & Automations** (Workflow) — triggers sur deals/contacts/taches, conditions, actions auto
6. **Dashboard & Rapports** (BarChart3) — dashboard personnalisable, rapports custom, widgets KPI

Import `Workflow` from lucide-react (replace `Zap`).

```tsx
import {
  MessageSquare,
  Users,
  KanbanSquare,
  CheckSquare,
  BarChart3,
  Workflow,
} from "lucide-react"

const features = [
  {
    icon: MessageSquare,
    illustration: "chat" as const,
    title: "Chat IA intelligent",
    description:
      "Parlez naturellement. L'IA comprend vos intentions et execute les actions : creer un contact, deplacer un deal, planifier une relance. Plus de 9 outils integres.",
    color: "text-primary",
    bgColor: "bg-primary/8",
  },
  {
    icon: Users,
    illustration: "contacts" as const,
    title: "Contacts & Segments",
    description:
      "Base de contacts enrichie automatiquement. Segments dynamiques, detection de doublons intelligente, lead scoring et timeline complete d'interactions.",
    color: "text-teal",
    bgColor: "bg-teal/8",
  },
  {
    icon: KanbanSquare,
    illustration: "pipeline" as const,
    title: "Pipeline & Deals",
    description:
      "Multi-pipeline personnalisable avec Kanban drag-and-drop. Entonnoir de conversion, probabilites, et suivi complet de chaque opportunite.",
    color: "text-warm",
    bgColor: "bg-warm/8",
  },
  {
    icon: CheckSquare,
    illustration: "tasks" as const,
    title: "Taches & Rappels",
    description:
      "Assignation a l'equipe, vue liste et calendrier, rappels automatiques. Ne ratez plus jamais une relance ou un suivi important.",
    color: "text-primary",
    bgColor: "bg-primary/8",
  },
  {
    icon: Workflow,
    illustration: "ai" as const,
    title: "Workflows & Automations",
    description:
      "Automatisez vos processus : triggers sur deals, contacts ou taches, conditions personnalisees, actions automatiques. Gagnez du temps chaque jour.",
    color: "text-teal",
    bgColor: "bg-teal/8",
  },
  {
    icon: BarChart3,
    illustration: "dashboard" as const,
    title: "Dashboard & Rapports",
    description:
      "Dashboard personnalisable avec widgets KPI. Rapports custom, analyse du pipeline, suivi de performance. Tout en temps reel.",
    color: "text-warm",
    bgColor: "bg-warm/8",
  },
]
```

**Step 2: Verify visually**

Check: Features section on homepage shows 6 updated cards.

**Step 3: Commit**

```bash
git add frontend/components/landing/features.tsx
git commit -m "feat(landing): update features section with current CRM capabilities"
```

---

## Task 3: Create new "Everything" section component

**Files:**
- Create: `frontend/components/landing/everything.tsx`

**Step 1: Create the component**

Create a new component showing a compact grid of ~12 secondary features. Use the same design patterns as existing landing components (motion animations, same color palette, lucide icons).

```tsx
"use client"

import { motion } from "motion/react"
import {
  FileSpreadsheet,
  Mail,
  Package,
  Search,
  StickyNote,
  Copy,
  Building2,
  Shield,
  Filter,
  ListFilter,
  Inbox,
  Bell,
} from "lucide-react"

const capabilities = [
  { icon: FileSpreadsheet, title: "Import / Export CSV", description: "Importez et exportez vos contacts en un clic" },
  { icon: Mail, title: "Email templates", description: "Modeles d'emails reutilisables et personnalisables" },
  { icon: Package, title: "Produits & Catalogue", description: "Gerez vos produits, tarifs et categories" },
  { icon: Search, title: "Recherche globale", description: "Trouvez contacts, deals et taches instantanement" },
  { icon: StickyNote, title: "Notes riches", description: "Editeur de notes complet sur chaque contact" },
  { icon: Copy, title: "Detection de doublons", description: "Detection intelligente et fusion assistee" },
  { icon: Building2, title: "Multi-organisation", description: "Gerez plusieurs structures depuis un compte" },
  { icon: Shield, title: "Roles & Permissions", description: "Controlez les acces de chaque membre" },
  { icon: Filter, title: "Entonnoir de conversion", description: "Visualisez vos taux de conversion par etape" },
  { icon: ListFilter, title: "Segments dynamiques", description: "Groupes de contacts avec regles automatiques" },
  { icon: Inbox, title: "Integration email", description: "Connectez Gmail et Outlook en un clic" },
  { icon: Bell, title: "Rappels & Notifications", description: "Alertes automatiques pour ne rien oublier" },
]

export function Everything() {
  return (
    <section className="relative py-24 lg:py-32 bg-muted/30">
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-border to-transparent" />

      <div className="mx-auto max-w-6xl px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.5 }}
          className="text-center"
        >
          <span className="text-sm font-medium uppercase tracking-widest text-primary">
            Et bien plus encore
          </span>
          <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
            Tout ce que Qeylo peut faire
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-muted-foreground">
            Un CRM complet avec tout ce dont vous avez besoin pour gerer et developper votre activite.
          </p>
        </motion.div>

        <div className="mt-16 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {capabilities.map((item, index) => {
            const Icon = item.icon
            return (
              <motion.div
                key={item.title}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-40px" }}
                transition={{ duration: 0.3, delay: index * 0.04 }}
                className="flex items-start gap-3 rounded-xl border border-border/60 bg-card/50 p-4 transition-colors hover:border-primary/20"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/8">
                  <Icon className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold">{item.title}</h3>
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                    {item.description}
                  </p>
                </div>
              </motion.div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
```

**Step 2: Add Everything to landing page**

In `frontend/app/page.tsx`, import and add `Everything` between `Features` and `HowItWorks`:

```tsx
import { Everything } from "@/components/landing/everything"
// ... in JSX:
<Features />
<Everything />
<HowItWorks />
```

**Step 3: Verify visually**

Check: New grid section appears between Features and How It Works.

**Step 4: Commit**

```bash
git add frontend/components/landing/everything.tsx frontend/app/page.tsx
git commit -m "feat(landing): add 'everything' grid section showcasing all CRM capabilities"
```

---

## Task 4: Update Features page (`/features`)

**Files:**
- Modify: `frontend/app/(marketing)/features/page.tsx`

**Step 1: Update mainFeatures array**

Replace the `mainFeatures` array with updated features matching the 6 from landing. Update details lists to reflect current capabilities:

1. **Chat IA** — mention 9+ tools, multi-conversations, streaming, markdown
2. **Contacts & Segments** — enrichissement auto, segments dynamiques, doublons, lead scoring, categories
3. **Pipeline & Deals** — multi-pipeline, drag-drop, entonnoir, probabilites, filtres avances
4. **Taches & Rappels** — assignation equipe, calendrier, rappels, recurrence, priorites
5. **Workflows & Automations** — triggers deals/contacts/taches, conditions, delais, templates
6. **Dashboard & Rapports** — widgets personnalisables, rapports templates, KPI, graphiques

Update the `extraFeatures` array to include:
- Import/Export CSV
- Integration email (Gmail/Outlook)
- Multi-organisation
- Produits & Catalogue
- Recherche globale
- Detection de doublons

Change grid from `sm:grid-cols-3` to `sm:grid-cols-2 lg:grid-cols-3` for 6 items.

Update imports: replace `Zap` with `Workflow`, add `FileSpreadsheet`, `Inbox`, `Building2`, `Package`, `Search`, `Copy`.

**Step 2: Update illustration variant for Workflows**

The Workflows card should use illustration variant `"ai"` (reuse existing AI illustration which has the interconnected nodes look — fits automations).

**Step 3: Verify visually**

Check: `/features` page shows updated features with correct details.

**Step 4: Commit**

```bash
git add frontend/app/\(marketing\)/features/page.tsx
git commit -m "feat(features): update features page with all current CRM capabilities"
```

---

## Task 5: Update Pricing page with comparison grid

**Files:**
- Modify: `frontend/app/(marketing)/pricing/page.tsx`

**Step 1: Update plans array**

Update features lists in each plan. Change Equipe to "Utilisateurs illimites".

```tsx
const plans = [
  {
    name: "Solo",
    price: "0",
    period: "Gratuit pour toujours",
    description: "Parfait pour demarrer en solo",
    features: [
      "1 utilisateur",
      "100 contacts",
      "1 pipeline (6 etapes)",
      "Chat IA — 50 messages/mois",
      "Dashboard basique",
      "Taches & rappels",
      "Recherche globale",
    ],
    cta: "Commencer gratuitement",
    href: "/register",
    highlight: false,
  },
  {
    name: "Pro",
    price: "19",
    period: "/ mois",
    description: "Pour les freelances qui grandissent",
    features: [
      "1 utilisateur",
      "Contacts illimites",
      "Multi-pipeline personnalisable",
      "Chat IA illimite",
      "Dashboard & rapports avances",
      "Workflows & automations",
      "Segments dynamiques",
      "Produits & catalogue",
      "Email templates",
      "Import/Export CSV",
      "Integration email",
      "Support prioritaire",
    ],
    cta: "Essai gratuit 14 jours",
    href: "/register",
    highlight: true,
  },
  {
    name: "Equipe",
    price: "49",
    period: "/ mois",
    description: "Pour les equipes ambitieuses",
    features: [
      "Utilisateurs illimites",
      "Tout du plan Pro",
      "Organisation partagee",
      "Roles & permissions",
      "Assignation de taches",
      "Rapports d'equipe",
      "API access",
      "Onboarding dedie",
    ],
    cta: "Contacter l'equipe",
    href: "/register",
    highlight: false,
  },
]
```

**Step 2: Add comparison grid data**

Add a `comparisonData` array grouped by category:

```tsx
const comparisonData = [
  {
    category: "General",
    features: [
      { name: "Utilisateurs", solo: "1", pro: "1", equipe: "Illimite" },
      { name: "Contacts", solo: "100", pro: "Illimite", equipe: "Illimite" },
    ],
  },
  {
    category: "CRM",
    features: [
      { name: "Pipelines", solo: "1", pro: "Illimite", equipe: "Illimite" },
      { name: "Etapes personnalisables", solo: false, pro: true, equipe: true },
      { name: "Deals", solo: "Illimite", pro: "Illimite", equipe: "Illimite" },
      { name: "Segments dynamiques", solo: false, pro: true, equipe: true },
      { name: "Produits & catalogue", solo: false, pro: true, equipe: true },
      { name: "Detection de doublons", solo: false, pro: true, equipe: true },
    ],
  },
  {
    category: "Productivite",
    features: [
      { name: "Taches & rappels", solo: true, pro: true, equipe: true },
      { name: "Vue calendrier", solo: true, pro: true, equipe: true },
      { name: "Assignation d'equipe", solo: false, pro: false, equipe: true },
      { name: "Workflows & automations", solo: false, pro: true, equipe: true },
      { name: "Email templates", solo: false, pro: true, equipe: true },
    ],
  },
  {
    category: "IA",
    features: [
      { name: "Chat IA", solo: "50 msg/mois", pro: "Illimite", equipe: "Illimite" },
    ],
  },
  {
    category: "Analytics",
    features: [
      { name: "Dashboard", solo: "Basique", pro: "Avance", equipe: "Avance" },
      { name: "Rapports personnalises", solo: false, pro: true, equipe: true },
      { name: "Entonnoir de conversion", solo: false, pro: true, equipe: true },
    ],
  },
  {
    category: "Integrations",
    features: [
      { name: "Integration email", solo: false, pro: true, equipe: true },
      { name: "Import/Export CSV", solo: false, pro: true, equipe: true },
      { name: "API access", solo: false, pro: false, equipe: true },
    ],
  },
  {
    category: "Support",
    features: [
      { name: "Email", solo: true, pro: true, equipe: true },
      { name: "Support prioritaire", solo: false, pro: true, equipe: true },
      { name: "Onboarding dedie", solo: false, pro: false, equipe: true },
    ],
  },
]
```

**Step 3: Add comparison grid JSX**

Add a new section between pricing cards and FAQ. Render a table-like grid with:
- Category headers (bold, separated)
- Feature rows with check/cross/text for each plan
- Sticky column headers (Solo/Pro/Equipe) on scroll
- Use `Check` and `X` icons from lucide-react for boolean values
- Responsive: on mobile, horizontally scrollable

**Step 4: Update FAQ**

Add 2 new FAQ entries:
- "Quelles automations puis-je creer ?" — explain triggers on deals/contacts/tasks, conditions, automatic actions
- "Puis-je connecter mon email ?" — Gmail and Outlook integration via OAuth

**Step 5: Verify visually**

Check: `/pricing` shows updated plans, comparison grid, and updated FAQ.

**Step 6: Commit**

```bash
git add frontend/app/\(marketing\)/pricing/page.tsx
git commit -m "feat(pricing): update plans, add feature comparison grid, update FAQ"
```

---

## Task 6: Update landing page pricing component

**Files:**
- Modify: `frontend/components/landing/pricing.tsx`

**Step 1: Update plans array**

Mirror the same plan updates from Task 5 (updated features lists, Equipe with "Utilisateurs illimites").

**Step 2: Verify visually**

Check: Homepage pricing section shows updated plans.

**Step 3: Commit**

```bash
git add frontend/components/landing/pricing.tsx
git commit -m "feat(landing): update pricing section with current plans"
```

---

## Task 7: Create Mentions Legales page

**Files:**
- Create: `frontend/app/(marketing)/mentions-legales/page.tsx`

**Step 1: Create the page**

Create a static legal page with proper French legal mentions. Use same layout pattern as features/pricing (Navbar + main content + Footer). Minimal motion animations (just the header).

Content sections:
1. Editeur du site (Qeylo SASU, Avignon, SIRET 922082698, capital 100 EUR, Hugo Frely)
2. Directeur de la publication (Hugo Frely)
3. Hebergement (DigitalOcean LLC, 101 6th Ave, New York, NY 10013)
4. Contact (hello@qeylo.com)
5. Propriete intellectuelle
6. Limitation de responsabilite
7. Droit applicable (droit francais, Tribunal de commerce d'Avignon)

Style: Clean typography, `prose` class for text sections, anchored section headings.

**Step 2: Verify visually**

Check: `/mentions-legales` renders correctly.

**Step 3: Commit**

```bash
git add frontend/app/\(marketing\)/mentions-legales/page.tsx
git commit -m "feat(legal): create mentions legales page"
```

---

## Task 8: Create Politique de Confidentialite page

**Files:**
- Create: `frontend/app/(marketing)/confidentialite/page.tsx`

**Step 1: Create the page**

RGPD-compliant privacy policy page. Same layout pattern.

Content sections:
1. Responsable du traitement (Qeylo SASU, hello@qeylo.com)
2. Donnees collectees (compte: nom, email, mdp / utilisation: logs, IP, navigateur / CRM: contacts, deals, taches)
3. Finalites (fourniture du service, amelioration, communication, securite)
4. Base legale (execution contrat, interet legitime, consentement)
5. Duree de conservation (duree du compte + 3 ans apres suppression)
6. Destinataires (DigitalOcean hebergement, pas de vente de donnees)
7. Transferts hors UE (DigitalOcean, clauses contractuelles types)
8. Droits des utilisateurs (acces, rectification, suppression, portabilite, opposition, limitation)
9. Cookies (fonctionnels uniquement, pas de cookies tiers marketing)
10. Securite (chiffrement, JWT, isolation par organisation)
11. Modifications de la politique
12. Contact DPO (hello@qeylo.com)

**Step 2: Verify visually**

Check: `/confidentialite` renders correctly.

**Step 3: Commit**

```bash
git add frontend/app/\(marketing\)/confidentialite/page.tsx
git commit -m "feat(legal): create privacy policy page (RGPD)"
```

---

## Task 9: Create CGU page

**Files:**
- Create: `frontend/app/(marketing)/cgu/page.tsx`

**Step 1: Create the page**

Terms of service page. Same layout pattern.

Content sections:
1. Objet (description du service Qeylo CRM)
2. Acceptation des CGU
3. Inscription et compte (email valide, mdp securise, responsabilite du compte)
4. Description du service (plans Solo/Pro/Equipe avec details)
5. Obligations de l'utilisateur (usage legal, pas de scraping, pas de contenu illegal)
6. Propriete intellectuelle (Qeylo detient les droits, utilisateur garde ses donnees)
7. Donnees personnelles (renvoi vers /confidentialite)
8. Disponibilite et maintenance
9. Responsabilite (limitation, force majeure)
10. Resiliation (par l'utilisateur a tout moment, par Qeylo en cas de violation)
11. Modification des CGU (notification par email, continuation = acceptation)
12. Droit applicable et litiges (droit francais, Tribunal de commerce d'Avignon)
13. Contact (hello@qeylo.com)

**Step 2: Verify visually**

Check: `/cgu` renders correctly.

**Step 3: Commit**

```bash
git add frontend/app/\(marketing\)/cgu/page.tsx
git commit -m "feat(legal): create terms of service page (CGU)"
```

---

## Task 10: Update Footer with working legal links

**Files:**
- Modify: `frontend/components/landing/footer.tsx:18-22`

**Step 1: Update legal links**

Replace the `#` href values in the footer Legal section:

```tsx
Legal: [
  { label: "Mentions legales", href: "/mentions-legales" },
  { label: "Confidentialite", href: "/confidentialite" },
  { label: "CGU", href: "/cgu" },
],
```

**Step 2: Verify**

Check: Footer links navigate to correct legal pages.

**Step 3: Commit**

```bash
git add frontend/components/landing/footer.tsx
git commit -m "feat(footer): link legal pages (mentions legales, confidentialite, CGU)"
```

---

## Task 11: Final verification

**Step 1: Full visual check**

Navigate through all pages:
- `/` — landing page with updated hero, features, everything section, pricing
- `/features` — updated features page
- `/pricing` — updated pricing with comparison grid
- `/mentions-legales` — legal mentions
- `/confidentialite` — privacy policy
- `/cgu` — terms of service
- Footer links work on all pages

**Step 2: Mobile responsiveness check**

Check all pages at mobile viewport (375px width).

**Step 3: Final commit if any fixes needed**
