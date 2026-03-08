# i18n (FR/EN) Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add full internationalization (French + English) across the entire CRM — frontend (next-intl) and backend (Django i18n).

**Architecture:** Frontend uses `next-intl` with App Router middleware, `[locale]` route segment, and JSON translation files per namespace. Backend uses Django's native `gettext` with `LocaleMiddleware`, `Accept-Language` header detection, and per-user language preference for emails/PDFs.

**Tech Stack:** next-intl, Next.js App Router middleware, Django `django.utils.translation`, gettext `.po`/`.mo` files.

---

## Phase 1: Frontend Infrastructure

### Task 1: Install next-intl and create config files

**Files:**
- Modify: `frontend/package.json`
- Create: `frontend/i18n/config.ts`
- Create: `frontend/i18n/request.ts`
- Create: `frontend/i18n/routing.ts`

**Step 1: Install next-intl**

Run: `cd frontend && npm install next-intl`

**Step 2: Create i18n config**

Create `frontend/i18n/config.ts`:
```typescript
export const locales = ['fr', 'en'] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = 'fr';
```

**Step 3: Create routing config**

Create `frontend/i18n/routing.ts`:
```typescript
import { defineRouting } from 'next-intl/routing';
import { locales, defaultLocale } from './config';

export const routing = defineRouting({
  locales,
  defaultLocale,
  localePrefix: 'always',
});
```

**Step 4: Create request config**

Create `frontend/i18n/request.ts`:
```typescript
import { getRequestConfig } from 'next-intl/server';
import { routing } from './routing';

export default getRequestConfig(async ({ requestLocale }) => {
  let locale = await requestLocale;

  if (!locale || !routing.locales.includes(locale as any)) {
    locale = routing.defaultLocale;
  }

  // Load all namespace files for the locale
  const common = (await import(`@/messages/${locale}/common.json`)).default;
  const auth = (await import(`@/messages/${locale}/auth.json`)).default;
  const contacts = (await import(`@/messages/${locale}/contacts.json`)).default;
  const deals = (await import(`@/messages/${locale}/deals.json`)).default;
  const tasks = (await import(`@/messages/${locale}/tasks.json`)).default;
  const settings = (await import(`@/messages/${locale}/settings.json`)).default;
  const calendar = (await import(`@/messages/${locale}/calendar.json`)).default;
  const chat = (await import(`@/messages/${locale}/chat.json`)).default;
  const dashboard = (await import(`@/messages/${locale}/dashboard.json`)).default;
  const pipeline = (await import(`@/messages/${locale}/pipeline.json`)).default;
  const marketing = (await import(`@/messages/${locale}/marketing.json`)).default;
  const sidebar = (await import(`@/messages/${locale}/sidebar.json`)).default;
  const companies = (await import(`@/messages/${locale}/companies.json`)).default;
  const segments = (await import(`@/messages/${locale}/segments.json`)).default;
  const products = (await import(`@/messages/${locale}/products.json`)).default;
  const workflows = (await import(`@/messages/${locale}/workflows.json`)).default;
  const notifications = (await import(`@/messages/${locale}/notifications.json`)).default;

  return {
    locale,
    messages: {
      common,
      auth,
      contacts,
      deals,
      tasks,
      settings,
      calendar,
      chat,
      dashboard,
      pipeline,
      marketing,
      sidebar,
      companies,
      segments,
      products,
      workflows,
      notifications,
    },
  };
});
```

**Step 5: Commit**

```bash
git add frontend/i18n/ frontend/package.json frontend/package-lock.json
git commit -m "feat(i18n): install next-intl and create i18n config files"
```

---

### Task 2: Create middleware and update Next.js config

**Files:**
- Create: `frontend/middleware.ts`
- Modify: `frontend/next.config.ts`

**Step 1: Create middleware**

Create `frontend/middleware.ts`:
```typescript
import createMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';

export default createMiddleware(routing);

export const config = {
  matcher: [
    // Match all pathnames except for
    // - /api (API routes)
    // - /_next (Next.js internals)
    // - /_vercel (Vercel internals)
    // - /static (public files)
    // - Commonly accessed files like favicons
    '/((?!api|_next|_vercel|static|.*\\..*).*)',
  ],
};
```

**Step 2: Update next.config.ts**

Modify `frontend/next.config.ts` to add the next-intl plugin:
```typescript
import createNextIntlPlugin from 'next-intl/plugin';
import type { NextConfig } from "next";

const withNextIntl = createNextIntlPlugin('./i18n/request.ts');

const nextConfig: NextConfig = {
  output: "standalone",
};

export default withNextIntl(nextConfig);
```

**Step 3: Commit**

```bash
git add frontend/middleware.ts frontend/next.config.ts
git commit -m "feat(i18n): add next-intl middleware and update Next.js config"
```

---

### Task 3: Restructure app directory with [locale] segment

**Files:**
- Move: `frontend/app/layout.tsx` → keep as root, simplify
- Move: `frontend/app/(app)/` → `frontend/app/[locale]/(app)/`
- Move: `frontend/app/(auth)/` → `frontend/app/[locale]/(auth)/`
- Move: `frontend/app/(marketing)/` → `frontend/app/[locale]/(marketing)/`
- Create: `frontend/app/[locale]/layout.tsx`

**Step 1: Create [locale] layout**

Create `frontend/app/[locale]/layout.tsx` — this wraps all localized pages with `NextIntlClientProvider`:

```tsx
import { NextIntlClientProvider, useMessages } from 'next-intl';
import { notFound } from 'next/navigation';
import { routing } from '@/i18n/routing';

type Props = {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
};

export default async function LocaleLayout({ children, params }: Props) {
  const { locale } = await params;

  if (!routing.locales.includes(locale as any)) {
    notFound();
  }

  const messages = (await import(`@/messages/${locale}/common.json`)).default;
  // Note: next-intl getRequestConfig handles full message loading
  // This layout just validates the locale and renders children

  return children;
}
```

**Step 2: Update root layout**

Modify `frontend/app/layout.tsx`:
- Change `<html lang="fr">` to `<html lang={locale}>` using the locale from params
- Keep `AuthProvider`, fonts, metadata

The root layout needs to accept locale. With next-intl and `[locale]` segment, the root layout at `app/layout.tsx` stays minimal and the `[locale]/layout.tsx` handles the locale-specific wrapping.

Update `app/layout.tsx`:
```tsx
// Remove hardcoded lang="fr"
// The [locale]/layout.tsx will handle locale-specific rendering
// Root layout becomes:
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html suppressHydrationWarning>
      <body className={`${dmSans.variable} ${instrumentSerif.variable} ${jetBrainsMono.variable} font-sans antialiased`}>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
```

Then in `app/[locale]/layout.tsx`, set the `lang` attribute via `generateMetadata` or pass it through.

**Step 3: Move route groups into [locale]**

```bash
cd frontend/app
mkdir -p "[locale]"
mv "(app)" "[locale]/(app)"
mv "(auth)" "[locale]/(auth)"
mv "(marketing)" "[locale]/(marketing)"
```

**Step 4: Verify the app builds**

Run: `cd frontend && npm run build`
Expected: Build succeeds (pages may have missing translation keys but no structural errors)

**Step 5: Commit**

```bash
git add -A
git commit -m "feat(i18n): restructure app directory with [locale] route segment"
```

---

### Task 4: Create initial translation files (common + sidebar)

**Files:**
- Create: `frontend/messages/fr/common.json`
- Create: `frontend/messages/en/common.json`
- Create: `frontend/messages/fr/sidebar.json`
- Create: `frontend/messages/en/sidebar.json`

**Step 1: Create FR common.json**

```json
{
  "save": "Enregistrer",
  "cancel": "Annuler",
  "delete": "Supprimer",
  "edit": "Modifier",
  "create": "Créer",
  "search": "Rechercher",
  "loading": "Chargement...",
  "noResults": "Aucun résultat",
  "confirm": "Confirmer",
  "back": "Retour",
  "next": "Suivant",
  "previous": "Précédent",
  "close": "Fermer",
  "add": "Ajouter",
  "remove": "Retirer",
  "yes": "Oui",
  "no": "Non",
  "all": "Tous",
  "none": "Aucun",
  "actions": "Actions",
  "status": "Statut",
  "date": "Date",
  "name": "Nom",
  "email": "Email",
  "phone": "Téléphone",
  "description": "Description",
  "notes": "Notes",
  "error": "Erreur",
  "success": "Succès",
  "warning": "Attention",
  "info": "Information",
  "retry": "Réessayer",
  "export": "Exporter",
  "import": "Importer",
  "filter": "Filtrer",
  "sort": "Trier",
  "refresh": "Actualiser",
  "copyToClipboard": "Copier",
  "copied": "Copié !",
  "selectAll": "Tout sélectionner",
  "deselectAll": "Tout désélectionner",
  "showMore": "Voir plus",
  "showLess": "Voir moins",
  "createdAt": "Créé le",
  "updatedAt": "Mis à jour le",
  "pagination": {
    "previous": "Précédent",
    "next": "Suivant",
    "page": "Page",
    "of": "sur",
    "showing": "Affichage de",
    "to": "à",
    "results": "résultats"
  }
}
```

**Step 2: Create EN common.json**

```json
{
  "save": "Save",
  "cancel": "Cancel",
  "delete": "Delete",
  "edit": "Edit",
  "create": "Create",
  "search": "Search",
  "loading": "Loading...",
  "noResults": "No results",
  "confirm": "Confirm",
  "back": "Back",
  "next": "Next",
  "previous": "Previous",
  "close": "Close",
  "add": "Add",
  "remove": "Remove",
  "yes": "Yes",
  "no": "No",
  "all": "All",
  "none": "None",
  "actions": "Actions",
  "status": "Status",
  "date": "Date",
  "name": "Name",
  "email": "Email",
  "phone": "Phone",
  "description": "Description",
  "notes": "Notes",
  "error": "Error",
  "success": "Success",
  "warning": "Warning",
  "info": "Information",
  "retry": "Retry",
  "export": "Export",
  "import": "Import",
  "filter": "Filter",
  "sort": "Sort",
  "refresh": "Refresh",
  "copyToClipboard": "Copy",
  "copied": "Copied!",
  "selectAll": "Select all",
  "deselectAll": "Deselect all",
  "showMore": "Show more",
  "showLess": "Show less",
  "createdAt": "Created at",
  "updatedAt": "Updated at",
  "pagination": {
    "previous": "Previous",
    "next": "Next",
    "page": "Page",
    "of": "of",
    "showing": "Showing",
    "to": "to",
    "results": "results"
  }
}
```

**Step 3: Create FR sidebar.json**

```json
{
  "groups": {
    "crm": "CRM",
    "management": "Gestion",
    "analytics": "Analyse"
  },
  "items": {
    "chat": "Chat",
    "inbox": "Inbox",
    "contacts": "Contacts",
    "companies": "Entreprises",
    "segments": "Segments",
    "pipeline": "Pipeline",
    "funnel": "Entonnoir",
    "products": "Produits",
    "tasks": "Tâches",
    "workflows": "Workflows",
    "sequences": "Séquences",
    "calendar": "Calendrier",
    "dashboard": "Dashboard",
    "reports": "Rapports"
  },
  "trash": "Corbeille",
  "settings": "Paramètres",
  "logout": "Se déconnecter",
  "user": "Utilisateur",
  "organization": "Organisation",
  "createOrganization": "Créer une organisation"
}
```

**Step 4: Create EN sidebar.json**

```json
{
  "groups": {
    "crm": "CRM",
    "management": "Management",
    "analytics": "Analytics"
  },
  "items": {
    "chat": "Chat",
    "inbox": "Inbox",
    "contacts": "Contacts",
    "companies": "Companies",
    "segments": "Segments",
    "pipeline": "Pipeline",
    "funnel": "Funnel",
    "products": "Products",
    "tasks": "Tasks",
    "workflows": "Workflows",
    "sequences": "Sequences",
    "calendar": "Calendar",
    "dashboard": "Dashboard",
    "reports": "Reports"
  },
  "trash": "Trash",
  "settings": "Settings",
  "logout": "Log out",
  "user": "User",
  "organization": "Organization",
  "createOrganization": "Create organization"
}
```

**Step 5: Commit**

```bash
git add frontend/messages/
git commit -m "feat(i18n): add common and sidebar translation files (FR/EN)"
```

---

### Task 5: Migrate Sidebar component to use translations

**Files:**
- Modify: `frontend/components/Sidebar.tsx`

**Step 1: Update Sidebar to use useTranslations**

In `frontend/components/Sidebar.tsx`:

Replace hardcoded navigation groups with translation keys:

```tsx
'use client';
import { useTranslations } from 'next-intl';

// Inside the component:
const t = useTranslations('sidebar');
const tc = useTranslations('common');

// Replace hardcoded strings:
// "CRM" → t('groups.crm')
// "Gestion" → t('groups.management')
// "Analyse" → t('groups.analytics')
// "Entreprises" → t('items.companies')
// "Tâches" → t('items.tasks')
// "Corbeille" → t('trash')
// "Paramètres" → t('settings')
// "Se déconnecter" → t('logout')
// "Organisation" → t('organization')
// "Créer une organisation" → t('createOrganization')
// etc.
```

**Step 2: Verify sidebar renders correctly**

Run: `cd frontend && npm run dev`
Navigate to `/fr/dashboard` — sidebar should show French labels.
Navigate to `/en/dashboard` — sidebar should show English labels.

**Step 3: Commit**

```bash
git add frontend/components/Sidebar.tsx
git commit -m "feat(i18n): migrate Sidebar component to use translations"
```

---

### Task 6: Update API client to send Accept-Language header

**Files:**
- Modify: `frontend/lib/api.ts`

**Step 1: Add Accept-Language header to apiFetch**

In `frontend/lib/api.ts`, add the locale from cookie to all API requests:

```typescript
// At the top of apiFetch or in the headers construction:
function getLocaleFromCookie(): string {
  if (typeof document === 'undefined') return 'fr';
  const match = document.cookie.match(/NEXT_LOCALE=(\w+)/);
  return match?.[1] || 'fr';
}

// In the headers:
headers: {
  ...existingHeaders,
  'Accept-Language': getLocaleFromCookie(),
},
```

**Step 2: Commit**

```bash
git add frontend/lib/api.ts
git commit -m "feat(i18n): send Accept-Language header in API requests"
```

---

### Task 7: Add language selector to Settings page

**Files:**
- Modify: `frontend/app/[locale]/(app)/settings/page.tsx`
- Create: `frontend/messages/fr/settings.json`
- Create: `frontend/messages/en/settings.json`

**Step 1: Create settings translation files**

Create `frontend/messages/fr/settings.json` with all settings page strings (extracted from current hardcoded values):

```json
{
  "title": "Paramètres",
  "subtitle": "Gérez votre profil et votre organisation",
  "tabs": {
    "settings": "Paramètres",
    "billing": "Facturation"
  },
  "profile": {
    "title": "Informations personnelles",
    "fullName": "Nom complet",
    "email": "Adresse email",
    "emailNotifications": "Notifications email",
    "emailNotificationsDesc": "Recevoir les rappels et alertes par email",
    "language": "Langue",
    "languageDesc": "Choisissez la langue de l'interface"
  },
  "organization": {
    "title": "Organisation",
    "name": "Nom de l'organisation",
    "siret": "SIRET",
    "defaultLanguage": "Langue par défaut",
    "defaultLanguageDesc": "Langue utilisée pour les emails et documents"
  },
  "emailAccounts": {
    "title": "Comptes email connectés",
    "subtitle": "Envoyez des emails directement depuis le CRM",
    "connectGmail": "Connecter Gmail",
    "connectOutlook": "Connecter Outlook",
    "connected": "Connecté",
    "disconnect": "Déconnecter"
  },
  "aiUsage": {
    "title": "Consommation IA",
    "subtitle": "Suivre les coûts et tokens par organisation et utilisateur"
  },
  "duplicates": {
    "title": "Détection de doublons"
  },
  "emailTemplates": {
    "title": "Templates d'email"
  },
  "quotas": {
    "title": "Quotas mensuels",
    "subtitle": "Définir les objectifs de vente par commercial"
  },
  "toasts": {
    "emailConnected": "Compte email connecté",
    "emailConnectionError": "Erreur lors de la connexion du compte email",
    "subscriptionActivated": "Abonnement activé avec succès !",
    "paymentCanceled": "Paiement annulé.",
    "accountDisconnected": "Compte déconnecté",
    "updateError": "Erreur lors de la mise à jour",
    "profileUpdated": "Profil mis à jour",
    "languageUpdated": "Langue mise à jour"
  },
  "languages": {
    "fr": "Français",
    "en": "English"
  }
}
```

Create `frontend/messages/en/settings.json`:

```json
{
  "title": "Settings",
  "subtitle": "Manage your profile and organization",
  "tabs": {
    "settings": "Settings",
    "billing": "Billing"
  },
  "profile": {
    "title": "Personal Information",
    "fullName": "Full name",
    "email": "Email address",
    "emailNotifications": "Email notifications",
    "emailNotificationsDesc": "Receive reminders and alerts by email",
    "language": "Language",
    "languageDesc": "Choose the interface language"
  },
  "organization": {
    "title": "Organization",
    "name": "Organization name",
    "siret": "SIRET",
    "defaultLanguage": "Default language",
    "defaultLanguageDesc": "Language used for emails and documents"
  },
  "emailAccounts": {
    "title": "Connected email accounts",
    "subtitle": "Send emails directly from the CRM",
    "connectGmail": "Connect Gmail",
    "connectOutlook": "Connect Outlook",
    "connected": "Connected",
    "disconnect": "Disconnect"
  },
  "aiUsage": {
    "title": "AI Usage",
    "subtitle": "Track costs and tokens per organization and user"
  },
  "duplicates": {
    "title": "Duplicate detection"
  },
  "emailTemplates": {
    "title": "Email templates"
  },
  "quotas": {
    "title": "Monthly quotas",
    "subtitle": "Set sales targets per team member"
  },
  "toasts": {
    "emailConnected": "Email account connected",
    "emailConnectionError": "Error connecting email account",
    "subscriptionActivated": "Subscription activated successfully!",
    "paymentCanceled": "Payment canceled.",
    "accountDisconnected": "Account disconnected",
    "updateError": "Error updating",
    "profileUpdated": "Profile updated",
    "languageUpdated": "Language updated"
  },
  "languages": {
    "fr": "Français",
    "en": "English"
  }
}
```

**Step 2: Add language selector in Settings page**

In the Settings page, add a language dropdown in the profile section:

```tsx
import { useTranslations } from 'next-intl';
import { useRouter, usePathname } from 'next/navigation';

const t = useTranslations('settings');

// Language change handler:
const handleLanguageChange = async (newLocale: string) => {
  // Update user preference via API
  await apiFetch('/accounts/me/', {
    method: 'PATCH',
    body: JSON.stringify({ preferred_language: newLocale }),
  });
  // Update cookie and redirect
  document.cookie = `NEXT_LOCALE=${newLocale};path=/;max-age=31536000`;
  const currentPath = pathname.replace(/^\/(fr|en)/, '');
  router.push(`/${newLocale}${currentPath}`);
};
```

**Step 3: Replace all hardcoded strings in Settings page with t() calls**

Go through every French string in the settings page and replace with the corresponding translation key.

**Step 4: Verify**

Run: `cd frontend && npm run dev`
Navigate to `/fr/settings` — all strings in French
Navigate to `/en/settings` — all strings in English
Change language in dropdown — redirects to other locale

**Step 5: Commit**

```bash
git add frontend/messages/fr/settings.json frontend/messages/en/settings.json frontend/app/\[locale\]/\(app\)/settings/page.tsx
git commit -m "feat(i18n): migrate Settings page with language selector"
```

---

### Task 8: Create auth translation files and migrate auth pages

**Files:**
- Create: `frontend/messages/fr/auth.json`
- Create: `frontend/messages/en/auth.json`
- Modify: `frontend/app/[locale]/(auth)/login/page.tsx`
- Modify: `frontend/app/[locale]/(auth)/register/page.tsx` (if exists)

**Step 1: Create auth translation files**

`frontend/messages/fr/auth.json`:
```json
{
  "login": {
    "title": "Connexion",
    "subtitle": "Connectez-vous pour accéder à votre CRM",
    "emailPlaceholder": "vous@exemple.com",
    "password": "Mot de passe",
    "passwordPlaceholder": "Votre mot de passe",
    "submit": "Se connecter",
    "submitting": "Connexion...",
    "noAccount": "Pas encore de compte ?",
    "createAccount": "Créer un compte",
    "forgotPassword": "Mot de passe oublié ?"
  },
  "register": {
    "title": "Créer un compte",
    "subtitle": "Commencez à gérer vos contacts et deals",
    "firstName": "Prénom",
    "lastName": "Nom",
    "email": "Email",
    "password": "Mot de passe",
    "submit": "Créer mon compte",
    "submitting": "Création...",
    "hasAccount": "Déjà un compte ?",
    "login": "Se connecter"
  },
  "errors": {
    "invalidCredentials": "Email ou mot de passe incorrect",
    "serverError": "Erreur serveur, veuillez réessayer",
    "emailRequired": "L'email est requis",
    "passwordRequired": "Le mot de passe est requis"
  }
}
```

`frontend/messages/en/auth.json`:
```json
{
  "login": {
    "title": "Sign In",
    "subtitle": "Sign in to access your CRM",
    "emailPlaceholder": "you@example.com",
    "password": "Password",
    "passwordPlaceholder": "Your password",
    "submit": "Sign in",
    "submitting": "Signing in...",
    "noAccount": "Don't have an account?",
    "createAccount": "Create an account",
    "forgotPassword": "Forgot password?"
  },
  "register": {
    "title": "Create an account",
    "subtitle": "Start managing your contacts and deals",
    "firstName": "First name",
    "lastName": "Last name",
    "email": "Email",
    "password": "Password",
    "submit": "Create my account",
    "submitting": "Creating...",
    "hasAccount": "Already have an account?",
    "login": "Sign in"
  },
  "errors": {
    "invalidCredentials": "Invalid email or password",
    "serverError": "Server error, please try again",
    "emailRequired": "Email is required",
    "passwordRequired": "Password is required"
  }
}
```

**Step 2: Migrate login page**

Replace all hardcoded strings in `login/page.tsx` with `t()` calls:
```tsx
const t = useTranslations('auth');
// "Connexion" → t('login.title')
// "Connectez-vous pour accéder à votre CRM" → t('login.subtitle')
// etc.
```

**Step 3: Migrate register page (same pattern)**

**Step 4: Verify both pages render in FR and EN**

**Step 5: Commit**

```bash
git add frontend/messages/fr/auth.json frontend/messages/en/auth.json frontend/app/\[locale\]/\(auth\)/
git commit -m "feat(i18n): migrate auth pages (login, register) to translations"
```

---

## Phase 2: Migrate Frontend Modules (one per task)

Each task follows the same pattern:
1. Create `messages/fr/<module>.json` with strings extracted from components
2. Create `messages/en/<module>.json` with English translations
3. Replace hardcoded strings in all components of that module with `t()` calls
4. Verify in both locales
5. Commit

### Task 9: Contacts module

**Files:**
- Create: `frontend/messages/fr/contacts.json`
- Create: `frontend/messages/en/contacts.json`
- Modify: `frontend/app/[locale]/(app)/contacts/page.tsx`
- Modify: `frontend/components/contacts/*.tsx` (all contact components)

Extract all French strings from contacts page and components (table headers, form labels, status labels, search placeholder, toast messages, empty states, etc.) into the contacts namespace.

**Commit:** `feat(i18n): migrate contacts module to translations`

---

### Task 10: Companies module

**Files:**
- Create: `frontend/messages/fr/companies.json`
- Create: `frontend/messages/en/companies.json`
- Modify: `frontend/app/[locale]/(app)/companies/page.tsx`
- Modify: `frontend/components/companies/*.tsx`

**Commit:** `feat(i18n): migrate companies module to translations`

---

### Task 11: Deals & Pipeline module

**Files:**
- Create: `frontend/messages/fr/deals.json`
- Create: `frontend/messages/en/deals.json`
- Create: `frontend/messages/fr/pipeline.json`
- Create: `frontend/messages/en/pipeline.json`
- Modify: `frontend/app/[locale]/(app)/deals/page.tsx`
- Modify: `frontend/app/[locale]/(app)/pipeline/**.tsx`
- Modify: `frontend/components/deals/*.tsx`
- Modify: `frontend/components/pipeline/*.tsx`

**Commit:** `feat(i18n): migrate deals and pipeline module to translations`

---

### Task 12: Tasks module

**Files:**
- Create: `frontend/messages/fr/tasks.json`
- Create: `frontend/messages/en/tasks.json`
- Modify: `frontend/app/[locale]/(app)/tasks/page.tsx`
- Modify: `frontend/components/tasks/*.tsx`

**Commit:** `feat(i18n): migrate tasks module to translations`

---

### Task 13: Calendar module

**Files:**
- Create: `frontend/messages/fr/calendar.json`
- Create: `frontend/messages/en/calendar.json`
- Modify: `frontend/app/[locale]/(app)/calendar/page.tsx`
- Modify: `frontend/components/calendar/*.tsx`

**Commit:** `feat(i18n): migrate calendar module to translations`

---

### Task 14: Chat module

**Files:**
- Create: `frontend/messages/fr/chat.json`
- Create: `frontend/messages/en/chat.json`
- Modify: `frontend/app/[locale]/(app)/chat/page.tsx`
- Modify: `frontend/components/chat/*.tsx`

**Commit:** `feat(i18n): migrate chat module to translations`

---

### Task 15: Dashboard module

**Files:**
- Create: `frontend/messages/fr/dashboard.json`
- Create: `frontend/messages/en/dashboard.json`
- Modify: `frontend/app/[locale]/(app)/dashboard/page.tsx`
- Modify: `frontend/components/dashboard/*.tsx`

**Commit:** `feat(i18n): migrate dashboard module to translations`

---

### Task 16: Segments, Products, Workflows, Sequences modules

**Files:**
- Create: `frontend/messages/fr/segments.json`, `products.json`, `workflows.json`
- Create: `frontend/messages/en/segments.json`, `products.json`, `workflows.json`
- Modify: respective page and component files

**Commit:** `feat(i18n): migrate segments, products, workflows modules to translations`

---

### Task 17: Marketing pages

**Files:**
- Create: `frontend/messages/fr/marketing.json`
- Create: `frontend/messages/en/marketing.json`
- Modify: `frontend/app/[locale]/(marketing)/features/page.tsx`
- Modify: `frontend/app/[locale]/(marketing)/pricing/page.tsx`
- Modify: `frontend/app/[locale]/(marketing)/cgu/page.tsx`
- Modify: `frontend/app/[locale]/(marketing)/mentions-legales/page.tsx`
- Modify: `frontend/app/[locale]/(marketing)/confidentialite/page.tsx`

**Commit:** `feat(i18n): migrate marketing pages to translations`

---

### Task 18: Notifications module

**Files:**
- Create: `frontend/messages/fr/notifications.json`
- Create: `frontend/messages/en/notifications.json`
- Modify: notification-related components (toasts, notification center, etc.)

**Commit:** `feat(i18n): migrate notifications to translations`

---

## Phase 3: Backend i18n

### Task 19: Configure Django i18n settings

**Files:**
- Modify: `backend/config/settings.py`

**Step 1: Update settings**

In `backend/config/settings.py`:

```python
# Internationalization
LANGUAGE_CODE = "fr"

LANGUAGES = [
    ("fr", "Français"),
    ("en", "English"),
]

USE_I18N = True
USE_TZ = True
TIME_ZONE = "Europe/Paris"

LOCALE_PATHS = [
    BASE_DIR / "locale",
]
```

**Step 2: Add LocaleMiddleware**

In the `MIDDLEWARE` list, add `django.middleware.locale.LocaleMiddleware` after `SessionMiddleware`:

```python
MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "whitenoise.middleware.WhiteNoiseMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.locale.LocaleMiddleware",  # <-- ADD HERE
    "corsheaders.middleware.CorsMiddleware",
    "django.middleware.common.CommonMiddleware",
    # ... rest stays the same
]
```

**Step 3: Create locale directories**

```bash
mkdir -p backend/locale/fr/LC_MESSAGES
mkdir -p backend/locale/en/LC_MESSAGES
```

**Step 4: Commit**

```bash
git add backend/config/settings.py backend/locale/
git commit -m "feat(i18n): configure Django i18n settings and LocaleMiddleware"
```

---

### Task 20: Add preferred_language to User model

**Files:**
- Modify: `backend/accounts/models.py`
- Modify: `backend/accounts/serializers.py`
- Modify: `backend/accounts/views.py`
- Create: migration file

**Step 1: Add field to User model**

In `backend/accounts/models.py`:

```python
class User(AbstractUser):
    # ... existing fields ...
    preferred_language = models.CharField(
        max_length=5,
        choices=[("fr", "Français"), ("en", "English")],
        default="fr",
    )
```

**Step 2: Update serializer**

In `backend/accounts/serializers.py`, add `preferred_language` to `UserSerializer.Meta.fields`.

**Step 3: Update view**

In `backend/accounts/views.py`, update the `me` view to handle PATCH for `preferred_language`:

```python
if "preferred_language" in request.data:
    user.preferred_language = request.data["preferred_language"]
    user.save(update_fields=["preferred_language"])
```

**Step 4: Create and run migration**

```bash
cd backend
python manage.py makemigrations accounts
python manage.py migrate
```

**Step 5: Commit**

```bash
git add backend/accounts/
git commit -m "feat(i18n): add preferred_language field to User model"
```

---

### Task 21: Add default_language to OrganizationSettings

**Files:**
- Modify: `backend/organizations/models.py`
- Modify: `backend/organizations/serializers.py`
- Create: migration file

**Step 1: Add field to OrganizationSettings**

In `backend/organizations/models.py`:

```python
class OrganizationSettings(models.Model):
    # ... existing fields ...
    default_language = models.CharField(
        max_length=5,
        choices=[("fr", "Français"), ("en", "English")],
        default="fr",
    )
```

**Step 2: Update serializer**

Add `default_language` to `OrganizationSettingsSerializer.Meta.fields`.

**Step 3: Create and run migration**

```bash
python manage.py makemigrations organizations
python manage.py migrate
```

**Step 4: Commit**

```bash
git add backend/organizations/
git commit -m "feat(i18n): add default_language field to OrganizationSettings"
```

---

### Task 22: Wrap backend strings with gettext

**Files:**
- Modify: `backend/notifications/email.py`
- Modify: `backend/accounts/views.py`
- Modify: `backend/organizations/views.py`
- Modify: `backend/contacts/serializers.py`
- Modify: `backend/emails/service.py`
- Modify: Any other files with hardcoded French strings

**Step 1: Wrap strings in notifications/email.py**

```python
from django.utils.translation import gettext_lazy as _, gettext

# Replace hardcoded strings:
# "Vous avez été invité(e)" → _("Vous avez été invité(e)")
# "Vos rappels du jour" → _("Vos rappels du jour")
# etc.
```

**Step 2: Wrap strings in views and serializers**

Same pattern — import `_` from `django.utils.translation` and wrap all user-facing strings.

**Step 3: Generate translation files**

```bash
cd backend
python manage.py makemessages -l fr
python manage.py makemessages -l en
```

This creates `.po` files in `locale/fr/LC_MESSAGES/django.po` and `locale/en/LC_MESSAGES/django.po`.

**Step 4: Translate the English .po file**

Edit `locale/en/LC_MESSAGES/django.po` and fill in English translations for each `msgid`.

**Step 5: Compile messages**

```bash
python manage.py compilemessages
```

**Step 6: Commit**

```bash
git add backend/
git commit -m "feat(i18n): wrap backend strings with gettext and create translation files"
```

---

### Task 23: Update email sending to respect user language

**Files:**
- Modify: `backend/notifications/email.py`

**Step 1: Update email functions**

```python
from django.utils.translation import override as translation_override, gettext as _

def send_invitation_email(to: str, org_name: str, invite_link: str) -> None:
    # For invitations, we don't know user language — use org default or 'fr'
    _send(to, _("Invitation à rejoindre {org_name}").format(org_name=org_name), html)

def send_notification_email(to: str, title: str, message: str, user=None) -> None:
    lang = 'fr'
    if user and hasattr(user, 'preferred_language'):
        lang = user.preferred_language
    with translation_override(lang):
        _send(to, title, _build_html(message))

def send_reminder_email(to: str, reminders: list, user=None) -> None:
    lang = 'fr'
    if user and hasattr(user, 'preferred_language'):
        lang = user.preferred_language
    with translation_override(lang):
        subject = _("Vos rappels du jour")
        # ... build reminder HTML with translated strings
        _send(to, subject, html)
```

**Step 2: Update callers to pass user object**

Find all calls to `send_notification_email` and `send_reminder_email` and ensure they pass the `user` parameter.

**Step 3: Commit**

```bash
git add backend/notifications/
git commit -m "feat(i18n): update email sending to respect user language preference"
```

---

### Task 24: Update PDF template (quotes)

**Files:**
- Modify: `backend/deals/templates/deals/quote_pdf.html`

**Step 1: Add i18n template tags**

```html
{% load i18n %}

<!-- Replace hardcoded French: -->
<!-- "Devis" → {% trans "Devis" %} -->
<!-- "Emetteur" → {% trans "Emetteur" %} -->
<!-- "Client" → {% trans "Client" %} -->
<!-- "Valable jusqu'au" → {% trans "Valable jusqu'au" %} -->
<!-- etc. -->
```

**Step 2: Update the view that generates the PDF**

Ensure the PDF generation view wraps rendering with `translation_override` using the user's language:

```python
from django.utils.translation import override as translation_override

def generate_quote_pdf(request, quote_id):
    lang = request.user.preferred_language if hasattr(request.user, 'preferred_language') else 'fr'
    with translation_override(lang):
        html = render_to_string('deals/quote_pdf.html', context)
        # ... generate PDF with WeasyPrint
```

**Step 3: Run makemessages to pick up template strings**

```bash
python manage.py makemessages -l en
```

**Step 4: Translate new strings in the .po file**

**Step 5: Compile and commit**

```bash
python manage.py compilemessages
git add backend/deals/
git commit -m "feat(i18n): translate PDF quote template"
```

---

## Phase 4: Validation & Tooling

### Task 25: Create translation completeness check script

**Files:**
- Create: `frontend/scripts/check-translations.ts`

**Step 1: Create the script**

```typescript
#!/usr/bin/env npx tsx
/**
 * Compares translation keys between FR and EN to find missing translations.
 */
import * as fs from 'fs';
import * as path from 'path';

const messagesDir = path.join(__dirname, '..', 'messages');
const locales = ['fr', 'en'];

function getKeys(obj: any, prefix = ''): string[] {
  return Object.entries(obj).flatMap(([key, value]) => {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (typeof value === 'object' && value !== null) {
      return getKeys(value, fullKey);
    }
    return [fullKey];
  });
}

const allKeys: Record<string, Record<string, string[]>> = {};

for (const locale of locales) {
  const localeDir = path.join(messagesDir, locale);
  const files = fs.readdirSync(localeDir).filter(f => f.endsWith('.json'));

  for (const file of files) {
    const namespace = file.replace('.json', '');
    const content = JSON.parse(fs.readFileSync(path.join(localeDir, file), 'utf-8'));
    allKeys[namespace] = allKeys[namespace] || {};
    allKeys[namespace][locale] = getKeys(content);
  }
}

let hasErrors = false;

for (const [namespace, localeKeys] of Object.entries(allKeys)) {
  const frKeys = new Set(localeKeys['fr'] || []);
  const enKeys = new Set(localeKeys['en'] || []);

  const missingInEn = [...frKeys].filter(k => !enKeys.has(k));
  const missingInFr = [...enKeys].filter(k => !frKeys.has(k));

  if (missingInEn.length > 0) {
    console.error(`\n❌ ${namespace}: Missing in EN:`);
    missingInEn.forEach(k => console.error(`  - ${k}`));
    hasErrors = true;
  }
  if (missingInFr.length > 0) {
    console.error(`\n❌ ${namespace}: Missing in FR:`);
    missingInFr.forEach(k => console.error(`  - ${k}`));
    hasErrors = true;
  }
}

if (!hasErrors) {
  console.log('✅ All translation keys are in sync between FR and EN.');
}

process.exit(hasErrors ? 1 : 0);
```

**Step 2: Add npm script**

In `package.json`:
```json
"scripts": {
  "check-translations": "npx tsx scripts/check-translations.ts"
}
```

**Step 3: Run the script**

Run: `cd frontend && npm run check-translations`
Expected: All keys in sync (or list of missing keys to fix)

**Step 4: Commit**

```bash
git add frontend/scripts/check-translations.ts frontend/package.json
git commit -m "feat(i18n): add translation completeness check script"
```

---

### Task 26: Update auth context to sync locale on login

**Files:**
- Modify: `frontend/lib/auth.tsx`

**Step 1: After login, read user.preferred_language and sync locale**

```typescript
// In the login function, after successful auth:
const userData = await apiFetch('/accounts/me/');
if (userData.preferred_language) {
  document.cookie = `NEXT_LOCALE=${userData.preferred_language};path=/;max-age=31536000`;
  // If current locale differs, redirect
  const currentLocale = window.location.pathname.split('/')[1];
  if (currentLocale !== userData.preferred_language) {
    const pathWithoutLocale = window.location.pathname.replace(/^\/(fr|en)/, '');
    window.location.href = `/${userData.preferred_language}${pathWithoutLocale}`;
    return;
  }
}
```

**Step 2: Commit**

```bash
git add frontend/lib/auth.tsx
git commit -m "feat(i18n): sync locale with user preference on login"
```

---

### Task 27: Final integration test

**Step 1: Run frontend build**

Run: `cd frontend && npm run build`
Expected: Build succeeds with no errors

**Step 2: Run translation check**

Run: `cd frontend && npm run check-translations`
Expected: All keys in sync

**Step 3: Run backend tests**

Run: `cd backend && python manage.py test`
Expected: All tests pass

**Step 4: Manual smoke test**

- Visit `/fr/login` — French login page
- Visit `/en/login` — English login page
- Log in → check locale syncs with user preference
- Navigate all main pages in both locales
- Change language in settings → verify redirect and persistence
- Check an API error message returns in the correct language

**Step 5: Final commit**

```bash
git commit -m "feat(i18n): complete FR/EN internationalization"
```
