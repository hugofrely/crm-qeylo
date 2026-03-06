# Landing Page Update + Legal Pages — Design Document

**Date:** 2026-03-06
**Status:** Approved

---

## Scope

1. Update landing page to reflect all current CRM features
2. Update pricing page with detailed feature grid
3. Create legal pages (mentions legales, confidentialite, CGU)
4. Update footer with working legal links

---

## 1. Landing Page Updates

### Structure (option C — existing structure + new section)

```
Navbar (unchanged)
  Hero (updated subtitle)
  Features (6 cards — updated to reflect major features)
  NEW — "Tout ce que Qeylo peut faire" (compact grid ~12-15 items)
  How It Works (unchanged)
  Pricing (unchanged)
  CTA (unchanged)
Footer (updated — working legal links)
```

### Hero Changes
- Update subtitle to mention: contacts, deals, taches, automations, rapports, produits, segments

### Features Section — 6 Updated Cards
1. **Chat IA** — USP, unchanged concept
2. **Contacts & Segments** — contacts + segments dynamiques + detection doublons
3. **Pipeline & Deals** — multi-pipeline, Kanban, entonnoir de conversion
4. **Taches & Rappels** — assignation, calendrier, rappels automatiques
5. **Workflows & Automations** — triggers, conditions, actions automatiques
6. **Dashboard & Rapports** — dashboard personnalisable, rapports custom, widgets

### NEW Section — "Tout ce que Qeylo peut faire"
Compact grid with icon + title + short description:
- Import/Export CSV
- Email templates
- Produits & Catalogue
- Recherche globale
- Notes riches
- Detection de doublons
- Multi-organisation
- Roles & Permissions
- Entonnoir de conversion
- Segments dynamiques
- Integration email (Gmail/Outlook)
- Rappels & Notifications

---

## 2. Pricing Page Updates

### Structure
```
Navbar
  Header (unchanged)
  Pricing Cards (3 plans — updated features)
  NEW — Detailed feature comparison grid
  FAQ (updated)
Footer
```

### Plans (prices unchanged)

**Solo (0 EUR)**:
- 1 utilisateur
- 100 contacts
- 1 pipeline (6 etapes)
- Chat IA — 50 messages/mois
- Dashboard basique
- Taches & rappels
- Recherche globale

**Pro (19 EUR/mois)**:
- 1 utilisateur
- Contacts illimites
- Multi-pipeline personnalisable
- Chat IA illimite
- Dashboard & rapports avances
- Workflows & automations
- Segments dynamiques
- Produits & catalogue
- Email templates
- Import/Export CSV
- Integration email (Gmail/Outlook)
- Support prioritaire

**Equipe (49 EUR/mois)**:
- Utilisateurs illimites
- Tout du plan Pro
- Organisation partagee
- Roles & permissions
- Assignation de taches
- Rapports d'equipe
- API access
- Onboarding dedie

### Comparison Grid Categories
- **General**: Utilisateurs, Contacts, Stockage
- **CRM**: Pipeline, Deals, Segments, Produits, Doublons
- **Productivite**: Taches, Calendrier, Workflows, Email templates
- **IA**: Messages chat, Enrichissement
- **Analytics**: Dashboard, Rapports, Entonnoir
- **Integrations**: Email, CSV, API
- **Support**: Email, Prioritaire, Onboarding

### FAQ Updates
Keep existing 5 + add:
- "Quelles automations puis-je creer ?"
- "Puis-je connecter mon email ?"

---

## 3. Legal Pages

All under `(marketing)/` route group, same layout as features/pricing.

### `/mentions-legales` — Mentions Legales
- Editeur: Qeylo, SASU, siege Avignon, SIRET 922082698, capital 100 EUR
- Directeur de publication: Hugo Frely
- Hebergeur: DigitalOcean (San Francisco, CA)
- Contact: hello@qeylo.com
- Propriete intellectuelle
- Limitation de responsabilite

### `/confidentialite` — Politique de Confidentialite
- Responsable du traitement: Qeylo SASU
- Donnees collectees (compte, utilisation, cookies)
- Finalites du traitement
- Base legale (RGPD)
- Duree de conservation
- Droits des utilisateurs (acces, rectification, suppression, portabilite)
- Cookies et traceurs
- Hebergement et securite
- Contact DPO: hello@qeylo.com

### `/cgu` — Conditions Generales d'Utilisation
- Objet et champ d'application
- Inscription et compte utilisateur
- Description du service (plans Solo/Pro/Equipe)
- Obligations de l'utilisateur
- Propriete intellectuelle
- Donnees personnelles (renvoi vers /confidentialite)
- Responsabilite et garanties
- Resiliation
- Modification des CGU
- Droit applicable et juridiction (Tribunal d'Avignon)

### Style
- Same layout as features/pricing (Navbar + content + Footer)
- Clean typography, sections with anchor links for navigation
- No heavy animations — static, sober, readable content

---

## 4. Footer Update

Update links in `components/landing/footer.tsx`:
- Mentions legales -> `/mentions-legales`
- Confidentialite -> `/confidentialite`
- CGU -> `/cgu`

---

## Legal Entity Info

- Societe: Qeylo
- Forme: SASU
- Siege: Avignon
- SIRET: 922082698
- Capital: 100 EUR
- Directeur publication: Hugo Frely
- Hebergeur: DigitalOcean
- Contact: hello@qeylo.com
