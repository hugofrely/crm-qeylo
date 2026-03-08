# Landing Navbar + Feature Pages Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Redesign the landing navbar with a mega menu and create 5 dedicated feature category pages with rich, colorful, responsive designs.

**Architecture:** Replace the simple navbar with a mega menu dropdown showing 5 feature categories. Create 5 new feature pages (`/features/ai`, `/features/sales`, `/features/contacts`, `/features/productivity`, `/features/communication`). Replace the existing Features + Everything sections on the homepage with a compact category showcase. Add new i18n keys for both FR and EN.

**Tech Stack:** Next.js 16 App Router, React 19, Tailwind CSS 4, motion/react, next-intl, lucide-react, shadcn/ui

---

### Task 1: Add i18n keys for mega menu (FR + EN)

**Files:**
- Modify: `frontend/messages/fr/marketing.json`
- Modify: `frontend/messages/en/marketing.json`

**Step 1: Add mega menu keys to FR marketing.json**

Add inside the `"navbar"` object, after `"goToApp"`:

```json
"megaMenu": {
  "ai": {
    "title": "Intelligence Artificielle",
    "description": "Votre assistant IA qui comprend et execute vos demandes en langage naturel.",
    "explore": "Explorer l'IA"
  },
  "sales": {
    "title": "Ventes & Pipeline",
    "description": "Pipeline visuel, gestion des deals, entonnoir de conversion et catalogue produits.",
    "explore": "Explorer les ventes"
  },
  "contacts": {
    "title": "Contacts & Relations",
    "description": "Gestion des contacts, segments dynamiques, detection de doublons et import CSV.",
    "explore": "Explorer les contacts"
  },
  "productivity": {
    "title": "Productivite",
    "description": "Taches, workflows automatises, rappels intelligents, dashboard et recherche globale.",
    "explore": "Explorer la productivite"
  },
  "communication": {
    "title": "Communication",
    "description": "Templates email, integration email et sequences automatisees.",
    "explore": "Explorer la communication"
  },
  "allFeatures": "Voir toutes les fonctionnalites"
}
```

**Step 2: Add mega menu keys to EN marketing.json**

Same structure in English:

```json
"megaMenu": {
  "ai": {
    "title": "Artificial Intelligence",
    "description": "Your AI assistant that understands and executes your requests in natural language.",
    "explore": "Explore AI"
  },
  "sales": {
    "title": "Sales & Pipeline",
    "description": "Visual pipeline, deal management, conversion funnel and product catalog.",
    "explore": "Explore sales"
  },
  "contacts": {
    "title": "Contacts & Relations",
    "description": "Contact management, dynamic segments, duplicate detection and CSV import.",
    "explore": "Explore contacts"
  },
  "productivity": {
    "title": "Productivity",
    "description": "Tasks, automated workflows, smart reminders, dashboard and global search.",
    "explore": "Explore productivity"
  },
  "communication": {
    "title": "Communication",
    "description": "Email templates, email integration and automated sequences.",
    "explore": "Explore communication"
  },
  "allFeatures": "View all features"
}
```

**Step 3: Commit**

```bash
git add frontend/messages/fr/marketing.json frontend/messages/en/marketing.json
git commit -m "feat: add mega menu i18n keys for FR and EN"
```

---

### Task 2: Redesign the Navbar with Mega Menu

**Files:**
- Modify: `frontend/components/landing/navbar.tsx`

**Step 1: Rewrite navbar.tsx**

Replace the entire content of `frontend/components/landing/navbar.tsx` with a new navbar that includes:

- Same logo and layout structure
- Replace "Features" link with a mega menu trigger (hover on desktop, click on mobile)
- Keep "Tarifs"/"Pricing" as a simple link
- Mega menu: full-width glassmorphic dropdown with 5-column grid
- Each column: colored icon + title + description + "Explorer →" link
- Categories and their config:

```typescript
const categories = [
  { key: "ai", href: "/features/ai", icon: Sparkles, color: "#0D4F4F" },
  { key: "sales", href: "/features/sales", icon: TrendingUp, color: "#C9946E" },
  { key: "contacts", href: "/features/contacts", icon: Users, color: "#3D7A7A" },
  { key: "productivity", href: "/features/productivity", icon: Zap, color: "#8B5CF6" },
  { key: "communication", href: "/features/communication", icon: Mail, color: "#E5584A" },
]
```

- Desktop mega menu behavior: opens on hover with 150ms delay, closes on mouse leave
- AnimatePresence for smooth slide-down animation
- Bottom of mega menu: "Voir toutes les fonctionnalites" link pointing to `/features`
- Mobile: accordion pattern — clicking "Fonctionnalites" expands to show the 5 categories as a vertical list, each with icon + title + link
- Keep existing CTA buttons (login/register or go to app) unchanged
- Use `useRef` for hover timeout handling to prevent flickering

**Key design details for mega menu:**
- Container: `bg-background/95 backdrop-blur-xl border-b border-border/30 shadow-2xl`
- Each category column: hover effect with `bg-muted/50 rounded-xl p-4` transition
- Icon: `h-10 w-10 rounded-xl` with 10% opacity background of category color
- Title: `font-semibold text-sm`
- Description: `text-xs text-muted-foreground mt-1 leading-relaxed`
- "Explorer →" link: `text-xs font-medium mt-3` with category color, ArrowRight icon

**Step 2: Verify the navbar renders correctly**

Run: `cd frontend && npx next build --no-lint 2>&1 | tail -20` (or just check dev server)

**Step 3: Commit**

```bash
git add frontend/components/landing/navbar.tsx
git commit -m "feat: redesign navbar with mega menu for feature categories"
```

---

### Task 3: Add i18n keys for feature category pages (FR + EN)

**Files:**
- Modify: `frontend/messages/fr/marketing.json`
- Modify: `frontend/messages/en/marketing.json`

**Step 1: Add feature page keys to FR marketing.json**

Add 5 new top-level keys inside the marketing JSON. Each page follows this structure:

```json
"featuresAI": {
  "badge": "Intelligence Artificielle",
  "title": "Votre CRM pilote par",
  "titleGradient": "l'intelligence artificielle",
  "description": "Parlez naturellement a Qeylo. L'IA comprend vos intentions et execute les actions pour vous. Plus besoin de naviguer dans des menus — dites simplement ce que vous voulez.",
  "cta": "Essayer gratuitement",
  "ctaSecondary": "Voir une demo",
  "features": {
    "0": {
      "title": "Chat conversationnel",
      "description": "Tapez en langage naturel et l'IA execute. Creer un contact, deplacer un deal, planifier un rappel — tout se fait en une phrase.",
      "details": {
        "0": "Comprehension du langage naturel en francais et anglais",
        "1": "Plus de 9 outils integres",
        "2": "Streaming en temps reel avec rendu Markdown",
        "3": "Conversations multiples avec historique persistant"
      }
    },
    "1": {
      "title": "Actions automatiques",
      "description": "L'IA identifie les entites dans vos messages — contacts, montants, dates — et cree automatiquement les enregistrements correspondants.",
      "details": {
        "0": "Detection automatique des entites",
        "1": "Creation de contacts, deals et taches en une phrase",
        "2": "Mise a jour intelligente des champs existants",
        "3": "Suggestions contextuelles basees sur vos donnees"
      }
    },
    "2": {
      "title": "Analyse et insights",
      "description": "Interrogez vos donnees en langage naturel. Demandez un resume de votre pipeline, vos taches du jour, ou l'historique d'un contact.",
      "details": {
        "0": "Requetes en langage naturel sur vos donnees",
        "1": "Resume instantane du pipeline et des KPIs",
        "2": "Historique des interactions par contact",
        "3": "Recommandations d'actions basees sur l'activite"
      }
    }
  },
  "stats": {
    "0": { "value": "9+", "label": "outils IA integres" },
    "1": { "value": "< 1s", "label": "temps de reponse" },
    "2": { "value": "100%", "label": "en langage naturel" }
  }
},
"featuresSales": {
  "badge": "Ventes & Pipeline",
  "title": "Gerez vos ventes avec",
  "titleGradient": "clarte et precision",
  "description": "Un pipeline visuel et intuitif pour suivre chaque deal du premier contact a la signature. Drag-and-drop, multi-pipeline, et entonnoir de conversion.",
  "cta": "Essayer gratuitement",
  "ctaSecondary": "Voir une demo",
  "features": {
    "0": {
      "title": "Pipeline visuel",
      "description": "Suivez vos deals sur un Kanban intuitif avec glisser-deposer. Creez autant de pipelines que necessaire pour chaque processus commercial.",
      "details": {
        "0": "Multi-pipeline personnalisable",
        "1": "Glisser-deposer intuitif entre les etapes",
        "2": "Etapes personnalisables par pipeline",
        "3": "Vue d'ensemble de tous vos pipelines"
      }
    },
    "1": {
      "title": "Gestion des deals",
      "description": "Chaque deal a sa fiche complete : montant, probabilite, contact associe, historique d'activite et notes.",
      "details": {
        "0": "Fiches deals detaillees",
        "1": "Suivi du montant et de la probabilite",
        "2": "Historique complet des activites",
        "3": "Filtres avances : contact, montant, dates"
      }
    },
    "2": {
      "title": "Entonnoir & Produits",
      "description": "Visualisez vos taux de conversion par etape et gerez votre catalogue de produits avec tarifs et categories.",
      "details": {
        "0": "Entonnoir de conversion avec taux par etape",
        "1": "Catalogue produits avec tarifs",
        "2": "Categories de produits personnalisables",
        "3": "Analyse des performances commerciales"
      }
    }
  },
  "stats": {
    "0": { "value": "∞", "label": "pipelines" },
    "1": { "value": "D&D", "label": "drag and drop" },
    "2": { "value": "360°", "label": "vue sur vos deals" }
  }
},
"featuresContacts": {
  "badge": "Contacts & Relations",
  "title": "Une base de contacts",
  "titleGradient": "intelligente et vivante",
  "description": "Vos contacts se creent et s'enrichissent automatiquement. Segmentez, detectez les doublons, et suivez chaque interaction dans une timeline complete.",
  "cta": "Essayer gratuitement",
  "ctaSecondary": "Voir une demo",
  "features": {
    "0": {
      "title": "Gestion des contacts",
      "description": "Une fiche contact complete avec toutes les informations, l'historique des interactions, les deals associes et les notes.",
      "details": {
        "0": "Fiches contacts detaillees",
        "1": "Timeline complete d'interactions",
        "2": "Association contacts-entreprises",
        "3": "Lead scoring : chaud, tiede, froid"
      }
    },
    "1": {
      "title": "Segments dynamiques",
      "description": "Creez des groupes de contacts avec des regles automatiques. Les segments se mettent a jour en temps reel.",
      "details": {
        "0": "Regles de segmentation personnalisees",
        "1": "Mise a jour automatique en temps reel",
        "2": "Filtres multi-criteres",
        "3": "Export des segments en CSV"
      }
    },
    "2": {
      "title": "Doublons & Import",
      "description": "Detection intelligente des doublons avec fusion assistee. Importez vos contacts existants en CSV avec mapping de colonnes.",
      "details": {
        "0": "Detection automatique des doublons",
        "1": "Fusion assistee des fiches",
        "2": "Import CSV avec mapping intelligent",
        "3": "Export complet de vos donnees"
      }
    }
  },
  "stats": {
    "0": { "value": "0", "label": "doublon non detecte" },
    "1": { "value": "∞", "label": "segments dynamiques" },
    "2": { "value": "CSV", "label": "import & export" }
  }
},
"featuresProductivity": {
  "badge": "Productivite",
  "title": "Travaillez plus vite,",
  "titleGradient": "pas plus dur",
  "description": "Taches, workflows, rappels, dashboard — tous les outils pour automatiser le repetitif et vous concentrer sur l'essentiel.",
  "cta": "Essayer gratuitement",
  "ctaSecondary": "Voir une demo",
  "features": {
    "0": {
      "title": "Taches & Calendrier",
      "description": "Gerez vos taches en liste ou en calendrier. Assignez a l'equipe, configurez des rappels automatiques.",
      "details": {
        "0": "Vue liste et vue calendrier",
        "1": "Assignation aux membres de l'equipe",
        "2": "3 niveaux de priorite",
        "3": "Taches recurrentes"
      }
    },
    "1": {
      "title": "Workflows automatises",
      "description": "Definissez des triggers, des conditions et des actions pour automatiser vos processus metier.",
      "details": {
        "0": "Triggers : deal cree, etape changee, contact mis a jour",
        "1": "Conditions personnalisees et delais",
        "2": "Actions automatiques sur contacts, deals, taches",
        "3": "Templates de workflows prets a l'emploi"
      }
    },
    "2": {
      "title": "Dashboard & Rapports",
      "description": "Dashboard personnalisable avec widgets KPI. Creez des rapports sur mesure pour suivre votre performance.",
      "details": {
        "0": "Dashboard drag-and-drop personnalisable",
        "1": "Rapports custom : performance, pipeline, activite",
        "2": "KPI en temps reel",
        "3": "Recherche globale instantanee"
      }
    }
  },
  "stats": {
    "0": { "value": "Auto", "label": "workflows automatises" },
    "1": { "value": "24/7", "label": "rappels intelligents" },
    "2": { "value": "KPI", "label": "en temps reel" }
  }
},
"featuresCommunication": {
  "badge": "Communication",
  "title": "Centralisez vos",
  "titleGradient": "communications",
  "description": "Connectez votre email, creez des templates reutilisables et automatisez vos sequences de suivi.",
  "cta": "Essayer gratuitement",
  "ctaSecondary": "Voir une demo",
  "features": {
    "0": {
      "title": "Templates email",
      "description": "Creez des modeles d'emails reutilisables et personnalisables. Gagnez du temps sur chaque envoi.",
      "details": {
        "0": "Editeur de templates riche",
        "1": "Variables dynamiques (nom, entreprise...)",
        "2": "Templates partages avec l'equipe",
        "3": "Apercu avant envoi"
      }
    },
    "1": {
      "title": "Integration email",
      "description": "Connectez Gmail et Outlook en un clic. Centralisez toutes vos communications dans Qeylo.",
      "details": {
        "0": "Connexion OAuth Gmail & Outlook",
        "1": "Synchronisation bidirectionnelle",
        "2": "Historique email sur chaque contact",
        "3": "Envoi d'emails depuis Qeylo"
      }
    },
    "2": {
      "title": "Sequences automatisees",
      "description": "Creez des sequences d'emails automatisees pour vos relances et nurturing. Definissez les delais et les conditions.",
      "details": {
        "0": "Sequences multi-etapes",
        "1": "Delais personnalisables entre les emails",
        "2": "Conditions d'arret automatiques",
        "3": "Suivi des ouvertures et clics"
      }
    }
  },
  "stats": {
    "0": { "value": "Gmail", "label": "& Outlook integres" },
    "1": { "value": "Auto", "label": "sequences email" },
    "2": { "value": "1 clic", "label": "pour connecter" }
  }
}
```

**Step 2: Add the same keys in EN**

```json
"featuresAI": {
  "badge": "Artificial Intelligence",
  "title": "Your CRM powered by",
  "titleGradient": "artificial intelligence",
  "description": "Talk naturally to Qeylo. The AI understands your intentions and executes actions for you. No need to navigate menus — just say what you want.",
  "cta": "Try for free",
  "ctaSecondary": "See a demo",
  "features": {
    "0": {
      "title": "Conversational chat",
      "description": "Type in natural language and the AI executes. Create a contact, move a deal, schedule a reminder — everything happens in one sentence.",
      "details": {
        "0": "Natural language understanding in French and English",
        "1": "Over 9 integrated tools",
        "2": "Real-time streaming with Markdown rendering",
        "3": "Multiple conversations with persistent history"
      }
    },
    "1": {
      "title": "Automatic actions",
      "description": "The AI identifies entities in your messages — contacts, amounts, dates — and automatically creates the corresponding records.",
      "details": {
        "0": "Automatic entity detection",
        "1": "Create contacts, deals and tasks in one sentence",
        "2": "Intelligent update of existing fields",
        "3": "Contextual suggestions based on your data"
      }
    },
    "2": {
      "title": "Analysis and insights",
      "description": "Query your data in natural language. Ask for a pipeline summary, today's tasks, or a contact's history.",
      "details": {
        "0": "Natural language queries on your data",
        "1": "Instant pipeline and KPI summaries",
        "2": "Interaction history per contact",
        "3": "Action recommendations based on activity"
      }
    }
  },
  "stats": {
    "0": { "value": "9+", "label": "integrated AI tools" },
    "1": { "value": "< 1s", "label": "response time" },
    "2": { "value": "100%", "label": "natural language" }
  }
},
"featuresSales": {
  "badge": "Sales & Pipeline",
  "title": "Manage your sales with",
  "titleGradient": "clarity and precision",
  "description": "A visual and intuitive pipeline to track every deal from first contact to signature. Drag-and-drop, multi-pipeline, and conversion funnel.",
  "cta": "Try for free",
  "ctaSecondary": "See a demo",
  "features": {
    "0": {
      "title": "Visual pipeline",
      "description": "Track your deals on an intuitive Kanban with drag-and-drop. Create as many pipelines as needed for each sales process.",
      "details": {
        "0": "Customizable multi-pipeline",
        "1": "Intuitive drag-and-drop between stages",
        "2": "Customizable stages per pipeline",
        "3": "Overview of all your pipelines"
      }
    },
    "1": {
      "title": "Deal management",
      "description": "Each deal has a complete profile: amount, probability, associated contact, activity history and notes.",
      "details": {
        "0": "Detailed deal profiles",
        "1": "Amount and probability tracking",
        "2": "Complete activity history",
        "3": "Advanced filters: contact, amount, dates"
      }
    },
    "2": {
      "title": "Funnel & Products",
      "description": "Visualize your conversion rates by stage and manage your product catalog with pricing and categories.",
      "details": {
        "0": "Conversion funnel with rate per stage",
        "1": "Product catalog with pricing",
        "2": "Customizable product categories",
        "3": "Sales performance analysis"
      }
    }
  },
  "stats": {
    "0": { "value": "∞", "label": "pipelines" },
    "1": { "value": "D&D", "label": "drag and drop" },
    "2": { "value": "360°", "label": "view on your deals" }
  }
},
"featuresContacts": {
  "badge": "Contacts & Relations",
  "title": "A contact database",
  "titleGradient": "smart and alive",
  "description": "Your contacts are created and enriched automatically. Segment, detect duplicates, and track every interaction in a complete timeline.",
  "cta": "Try for free",
  "ctaSecondary": "See a demo",
  "features": {
    "0": {
      "title": "Contact management",
      "description": "A complete contact profile with all information, interaction history, associated deals and notes.",
      "details": {
        "0": "Detailed contact profiles",
        "1": "Complete interaction timeline",
        "2": "Contact-company association",
        "3": "Lead scoring: hot, warm, cold"
      }
    },
    "1": {
      "title": "Dynamic segments",
      "description": "Create contact groups with automatic rules. Segments update in real time.",
      "details": {
        "0": "Custom segmentation rules",
        "1": "Automatic real-time updates",
        "2": "Multi-criteria filters",
        "3": "Export segments to CSV"
      }
    },
    "2": {
      "title": "Duplicates & Import",
      "description": "Intelligent duplicate detection with assisted merging. Import your existing contacts via CSV with column mapping.",
      "details": {
        "0": "Automatic duplicate detection",
        "1": "Assisted record merging",
        "2": "CSV import with intelligent mapping",
        "3": "Complete data export"
      }
    }
  },
  "stats": {
    "0": { "value": "0", "label": "undetected duplicates" },
    "1": { "value": "∞", "label": "dynamic segments" },
    "2": { "value": "CSV", "label": "import & export" }
  }
},
"featuresProductivity": {
  "badge": "Productivity",
  "title": "Work smarter,",
  "titleGradient": "not harder",
  "description": "Tasks, workflows, reminders, dashboard — all the tools to automate the repetitive and focus on what matters.",
  "cta": "Try for free",
  "ctaSecondary": "See a demo",
  "features": {
    "0": {
      "title": "Tasks & Calendar",
      "description": "Manage your tasks in list or calendar view. Assign to the team, configure automatic reminders.",
      "details": {
        "0": "List view and calendar view",
        "1": "Assignment to team members",
        "2": "3 priority levels",
        "3": "Recurring tasks"
      }
    },
    "1": {
      "title": "Automated workflows",
      "description": "Define triggers, conditions and actions to automate your business processes.",
      "details": {
        "0": "Triggers: deal created, stage changed, contact updated",
        "1": "Custom conditions and delays",
        "2": "Automatic actions on contacts, deals, tasks",
        "3": "Ready-to-use workflow templates"
      }
    },
    "2": {
      "title": "Dashboard & Reports",
      "description": "Customizable dashboard with KPI widgets. Create custom reports to track your performance.",
      "details": {
        "0": "Customizable drag-and-drop dashboard",
        "1": "Custom reports: performance, pipeline, activity",
        "2": "Real-time KPIs",
        "3": "Instant global search"
      }
    }
  },
  "stats": {
    "0": { "value": "Auto", "label": "automated workflows" },
    "1": { "value": "24/7", "label": "smart reminders" },
    "2": { "value": "KPI", "label": "in real time" }
  }
},
"featuresCommunication": {
  "badge": "Communication",
  "title": "Centralize your",
  "titleGradient": "communications",
  "description": "Connect your email, create reusable templates and automate your follow-up sequences.",
  "cta": "Try for free",
  "ctaSecondary": "See a demo",
  "features": {
    "0": {
      "title": "Email templates",
      "description": "Create reusable and customizable email templates. Save time on every send.",
      "details": {
        "0": "Rich template editor",
        "1": "Dynamic variables (name, company...)",
        "2": "Templates shared with the team",
        "3": "Preview before sending"
      }
    },
    "1": {
      "title": "Email integration",
      "description": "Connect Gmail and Outlook in one click. Centralize all your communications in Qeylo.",
      "details": {
        "0": "Gmail & Outlook OAuth connection",
        "1": "Bidirectional synchronization",
        "2": "Email history on each contact",
        "3": "Send emails from Qeylo"
      }
    },
    "2": {
      "title": "Automated sequences",
      "description": "Create automated email sequences for your follow-ups and nurturing. Define delays and conditions.",
      "details": {
        "0": "Multi-step sequences",
        "1": "Customizable delays between emails",
        "2": "Automatic stop conditions",
        "3": "Open and click tracking"
      }
    }
  },
  "stats": {
    "0": { "value": "Gmail", "label": "& Outlook integrated" },
    "1": { "value": "Auto", "label": "email sequences" },
    "2": { "value": "1 click", "label": "to connect" }
  }
}
```

**Step 3: Commit**

```bash
git add frontend/messages/fr/marketing.json frontend/messages/en/marketing.json
git commit -m "feat: add i18n keys for 5 feature category pages (FR + EN)"
```

---

### Task 4: Create shared FeatureCategoryPage component

**Files:**
- Create: `frontend/components/landing/feature-category-page.tsx`

**Step 1: Create the reusable feature category page component**

This component receives a `category` prop and renders the full page. All 5 pages reuse this component with different configs.

```typescript
// Props interface
interface FeatureCategoryPageProps {
  category: "ai" | "sales" | "contacts" | "productivity" | "communication"
}

// Category config
const categoryConfig = {
  ai: { color: "#0D4F4F", colorLight: "#0D4F4F15", gradient: "from-[#0D4F4F] to-[#083838]", icon: Sparkles, featureCount: 3 },
  sales: { color: "#C9946E", colorLight: "#C9946E15", gradient: "from-[#C9946E] to-[#8B6B4A]", icon: TrendingUp, featureCount: 3 },
  contacts: { color: "#3D7A7A", colorLight: "#3D7A7A15", gradient: "from-[#3D7A7A] to-[#2A5555]", icon: Users, featureCount: 3 },
  productivity: { color: "#8B5CF6", colorLight: "#8B5CF615", gradient: "from-[#8B5CF6] to-[#6D28D9]", icon: Zap, featureCount: 3 },
  communication: { color: "#E5584A", colorLight: "#E5584A15", gradient: "from-[#E5584A] to-[#B8342A]", icon: Mail, featureCount: 3 },
}

// i18n key mapping
const i18nKeys = {
  ai: "featuresAI",
  sales: "featuresSales",
  contacts: "featuresContacts",
  productivity: "featuresProductivity",
  communication: "featuresCommunication",
}
```

The component structure:

**Hero section:**
- Gradient background using the category's gradient colors (applied as a large, blurred orb behind)
- Background dot grid overlay at 3% opacity
- Decorative large icon at 4% opacity in top-right corner
- Badge with category color background (10% opacity), category icon, and badge text
- Title in `text-4xl sm:text-5xl lg:text-6xl font-bold` with Instrument Serif feel
- `titleGradient` part uses `bg-gradient-to-r bg-clip-text text-transparent` with the category gradient
- Description text
- 2 CTA buttons: primary solid (category color) + secondary ghost

**Features sections (alternating left/right):**
- For each feature (0, 1, 2):
  - Even index: text left, illustration placeholder right
  - Odd index: text right, illustration placeholder left (using `md:[direction:rtl]` trick from existing code)
  - Icon in rounded box with category color
  - Title, description, detail bullet points with colored checkmarks
  - Between sections: animated accent line separator

**Stats band:**
- Full-width dark section with `bg-gradient-to-br from-[#0D1F1F] to-[#111110]`
- 3 stats in a row, each with `value` in large text + `label` below
- Value text uses category color
- Dot grid overlay, subtle glow effects

**Final CTA:**
- Reuse the existing `<CTA />` component from `@/components/landing/cta`

**Illustration placeholders:**
- Use decorative gradient cards with icons instead of real screenshots
- Card with border, rounded-2xl, gradient background using category color at low opacity
- Category icon centered, large (h-20 w-20), at 10% opacity
- Floating geometric shapes for visual interest

**Responsive:**
- Hero: stack vertically on mobile
- Feature sections: single column on mobile, 2 columns on md+
- Stats: stack on mobile, 3 columns on sm+
- All text: responsive sizing

**Animations:**
- Hero: fade in up on mount (initial, animate)
- Feature sections: fade in up on scroll (whileInView)
- Stats: staggered fade in (delay per item)

**Step 2: Commit**

```bash
git add frontend/components/landing/feature-category-page.tsx
git commit -m "feat: create shared FeatureCategoryPage component with hero, features, stats"
```

---

### Task 5: Create the 5 feature category page routes

**Files:**
- Create: `frontend/app/[locale]/(marketing)/features/ai/page.tsx`
- Create: `frontend/app/[locale]/(marketing)/features/sales/page.tsx`
- Create: `frontend/app/[locale]/(marketing)/features/contacts/page.tsx`
- Create: `frontend/app/[locale]/(marketing)/features/productivity/page.tsx`
- Create: `frontend/app/[locale]/(marketing)/features/communication/page.tsx`

**Step 1: Create each page file**

Each page is a thin wrapper around the shared component:

```typescript
"use client"

import { Navbar } from "@/components/landing/navbar"
import { Footer } from "@/components/landing/footer"
import { FeatureCategoryPage } from "@/components/landing/feature-category-page"

export default function FeaturesAIPage() {
  return (
    <>
      <Navbar />
      <main className="min-h-screen">
        <FeatureCategoryPage category="ai" />
      </main>
      <Footer />
    </>
  )
}
```

Repeat for `sales`, `contacts`, `productivity`, `communication` with appropriate category prop.

**Step 2: Create necessary directories**

```bash
mkdir -p frontend/app/\[locale\]/\(marketing\)/features/ai
mkdir -p frontend/app/\[locale\]/\(marketing\)/features/sales
mkdir -p frontend/app/\[locale\]/\(marketing\)/features/contacts
mkdir -p frontend/app/\[locale\]/\(marketing\)/features/productivity
mkdir -p frontend/app/\[locale\]/\(marketing\)/features/communication
```

**Step 3: Commit**

```bash
git add frontend/app/\[locale\]/\(marketing\)/features/
git commit -m "feat: add 5 feature category page routes (ai, sales, contacts, productivity, communication)"
```

---

### Task 6: Add i18n keys for homepage features showcase section

**Files:**
- Modify: `frontend/messages/fr/marketing.json`
- Modify: `frontend/messages/en/marketing.json`

**Step 1: Add showcase section keys**

Add to `features` object in FR:

```json
"showcase": {
  "label": "Fonctionnalites",
  "title": "Tout ce dont vous avez besoin",
  "description": "Un CRM complet organise en modules puissants. Explorez chaque fonctionnalite.",
  "explore": "Decouvrir",
  "categories": {
    "ai": {
      "title": "Intelligence Artificielle",
      "points": {
        "0": "Chat conversationnel en langage naturel",
        "1": "Actions automatiques sur vos donnees",
        "2": "Insights et analyse par l'IA"
      }
    },
    "sales": {
      "title": "Ventes & Pipeline",
      "points": {
        "0": "Pipeline Kanban drag-and-drop",
        "1": "Gestion des deals et produits",
        "2": "Entonnoir de conversion"
      }
    },
    "contacts": {
      "title": "Contacts & Relations",
      "points": {
        "0": "Segments dynamiques",
        "1": "Detection de doublons",
        "2": "Import / Export CSV"
      }
    },
    "productivity": {
      "title": "Productivite",
      "points": {
        "0": "Taches & calendrier",
        "1": "Workflows automatises",
        "2": "Dashboard personnalisable"
      }
    },
    "communication": {
      "title": "Communication",
      "points": {
        "0": "Templates email",
        "1": "Integration Gmail & Outlook",
        "2": "Sequences automatisees"
      }
    }
  }
}
```

Same in EN:

```json
"showcase": {
  "label": "Features",
  "title": "Everything you need",
  "description": "A complete CRM organized in powerful modules. Explore each feature.",
  "explore": "Discover",
  "categories": {
    "ai": {
      "title": "Artificial Intelligence",
      "points": {
        "0": "Natural language conversational chat",
        "1": "Automatic actions on your data",
        "2": "AI-powered insights and analysis"
      }
    },
    "sales": {
      "title": "Sales & Pipeline",
      "points": {
        "0": "Drag-and-drop Kanban pipeline",
        "1": "Deal and product management",
        "2": "Conversion funnel"
      }
    },
    "contacts": {
      "title": "Contacts & Relations",
      "points": {
        "0": "Dynamic segments",
        "1": "Duplicate detection",
        "2": "CSV Import / Export"
      }
    },
    "productivity": {
      "title": "Productivity",
      "points": {
        "0": "Tasks & calendar",
        "1": "Automated workflows",
        "2": "Customizable dashboard"
      }
    },
    "communication": {
      "title": "Communication",
      "points": {
        "0": "Email templates",
        "1": "Gmail & Outlook integration",
        "2": "Automated sequences"
      }
    }
  }
}
```

**Step 2: Commit**

```bash
git add frontend/messages/fr/marketing.json frontend/messages/en/marketing.json
git commit -m "feat: add i18n keys for homepage features showcase section"
```

---

### Task 7: Replace Features + Everything components on homepage

**Files:**
- Create: `frontend/components/landing/features-showcase.tsx`
- Modify: `frontend/app/[locale]/page.tsx`

**Step 1: Create the FeaturesShowcase component**

This replaces both `Features` and `Everything` on the homepage.

```typescript
// Category configs with same colors/icons as mega menu
const showcaseCategories = [
  { key: "ai", href: "/features/ai", icon: Sparkles, color: "#0D4F4F", span: "sm:col-span-2" }, // featured, larger
  { key: "sales", href: "/features/sales", icon: TrendingUp, color: "#C9946E", span: "" },
  { key: "contacts", href: "/features/contacts", icon: Users, color: "#3D7A7A", span: "" },
  { key: "productivity", href: "/features/productivity", icon: Zap, color: "#8B5CF6", span: "" },
  { key: "communication", href: "/features/communication", icon: Mail, color: "#E5584A", span: "" },
]
```

Design:
- Section header: label + title + description (same style as current Features section)
- Grid: `sm:grid-cols-2 lg:grid-cols-3` with AI card spanning 2 columns on sm
- Each card:
  - Rounded-2xl, border, overflow-hidden
  - Top: gradient band (4px) with category color
  - Padding p-6 (p-8 for AI card)
  - Icon in rounded-xl box with category color bg at 10%
  - Title in font-semibold
  - 3 bullet points with small colored dots
  - Bottom: "Decouvrir →" link in category color with ArrowRight icon
  - Hover: `-translate-y-1`, shadow increase, border changes to category color at 20%
  - Background: subtle gradient using category color at very low opacity
- AI card (span 2): larger icon, bigger title, can include a mini illustration/decorative element

**Step 2: Update homepage to use FeaturesShowcase**

In `frontend/app/[locale]/page.tsx`:
- Replace `import { Features }` with `import { FeaturesShowcase }`
- Remove `import { Everything }`
- Replace `<Features />` with `<FeaturesShowcase />`
- Remove `<Everything />`

**Step 3: Commit**

```bash
git add frontend/components/landing/features-showcase.tsx frontend/app/\[locale\]/page.tsx
git commit -m "feat: replace Features + Everything with FeaturesShowcase on homepage"
```

---

### Task 8: Update the existing features page to be a category index

**Files:**
- Modify: `frontend/app/[locale]/(marketing)/features/page.tsx`

**Step 1: Rewrite the features index page**

The `/features` page becomes an index page that lists all 5 categories with richer cards linking to each category page. Reuse similar design to FeaturesShowcase but with more detail — each card shows the category description and all sub-features listed.

Keep the same hero section but update it. Remove the old alternating feature sections and extra features strip. Replace with a 5-card grid linking to category pages + keep the CTA at the bottom.

**Step 2: Commit**

```bash
git add frontend/app/\[locale\]/\(marketing\)/features/page.tsx
git commit -m "feat: update features index page as category hub"
```

---

### Task 9: Update footer links for new feature pages

**Files:**
- Modify: `frontend/messages/fr/marketing.json`
- Modify: `frontend/messages/en/marketing.json`
- Modify: `frontend/components/landing/footer.tsx`

**Step 1: Update footer to include feature category links**

Add feature category links under the "Produit" / "Product" section in the footer:

FR keys to add in `footer.productLinks`:
```json
"ai": "Intelligence Artificielle",
"sales": "Ventes & Pipeline",
"contacts": "Contacts",
"productivity": "Productivite",
"communication": "Communication"
```

EN:
```json
"ai": "Artificial Intelligence",
"sales": "Sales & Pipeline",
"contacts": "Contacts",
"productivity": "Productivity",
"communication": "Communication"
```

**Step 2: Update footer.tsx**

Update the `footerLinks` product section to include the 5 new feature page links:
```typescript
{ label: t("productLinks.ai"), href: "/features/ai" as const },
{ label: t("productLinks.sales"), href: "/features/sales" as const },
{ label: t("productLinks.contacts"), href: "/features/contacts" as const },
{ label: t("productLinks.productivity"), href: "/features/productivity" as const },
{ label: t("productLinks.communication"), href: "/features/communication" as const },
```

**Step 3: Commit**

```bash
git add frontend/messages/fr/marketing.json frontend/messages/en/marketing.json frontend/components/landing/footer.tsx
git commit -m "feat: update footer with feature category page links"
```

---

### Task 10: Final verification and cleanup

**Files:**
- Possibly modify any files with issues

**Step 1: Run the dev server and check all pages**

```bash
cd frontend && npm run dev
```

Check these routes work:
- `/fr` (homepage with new FeaturesShowcase)
- `/fr/features` (category index)
- `/fr/features/ai`
- `/fr/features/sales`
- `/fr/features/contacts`
- `/fr/features/productivity`
- `/fr/features/communication`
- Verify mega menu opens on hover (desktop) and as accordion (mobile)
- Verify responsive layout on all pages
- Verify EN versions work too (`/en/...`)

**Step 2: Run build to check for errors**

```bash
cd frontend && npx next build --no-lint 2>&1 | tail -30
```

**Step 3: Clean up old unused components if applicable**

- Remove `frontend/components/landing/everything.tsx` if no longer imported anywhere
- Remove old `features.tsx` if fully replaced (check if anything else imports it)

**Step 4: Final commit**

```bash
git add -A
git commit -m "chore: cleanup old feature components, verify build"
```
