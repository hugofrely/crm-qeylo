# Design: Invitation Improvement & Charts Enrichment

## Chantier 1 — Invitation améliorée

### Problème
Quand un utilisateur invité clique sur le lien d'invitation et n'a pas de compte :
- Son email n'est pas pré-rempli sur la page d'inscription
- On lui demande un nom d'organisation alors qu'il en rejoint une existante
- Une organisation personnelle inutile est créée

### Solution

#### Frontend — register/page.tsx
- Lire `useSearchParams()` pour extraire `email` et `invite` (token)
- Si `invite` est présent :
  - Pré-remplir le champ email (read-only)
  - Masquer le champ "Nom de l'organisation"
  - Afficher un bandeau : "Vous rejoignez l'organisation **{nom_orga}**"
  - Récupérer le nom de l'orga via GET `/api/invite/accept/{token}/`
  - Envoyer `invite_token` dans le payload du register

#### Backend — accounts/views.py (register)
- Accepter un champ optionnel `invite_token`
- Si `invite_token` présent et valide :
  - Ne pas créer d'organisation personnelle
  - Accepter l'invitation (créer le Membership)
  - Retourner l'organisation de l'invitation dans la réponse
- Si absent : comportement actuel inchangé

#### Backend — Endpoint info invitation
- Ajouter un GET sur `/api/invite/accept/{token}/` retournant `{email, organization_name}` sans authentification

---

## Chantier 2 — Charts enrichis

### Problème
- Seulement 13 métriques dans l'outil IA, pas de montant par stage
- 4 types de charts seulement (bar, line, pie, funnel)
- L'éditeur de widgets a des options group_by limitées

### Solution

#### Nouvelles métriques (backend aggregation + outil IA)

| Source | Métrique | Group By |
|--------|----------|----------|
| Deals | `sum:amount` par stage | `stage` |
| Deals | `avg:amount` par stage | `stage` |
| Deals | count gagnés vs perdus | `outcome` |
| Deals | `sum:amount` gagnés vs perdus | `outcome` |
| Deals | durée moyenne par stage | `stage` |
| Deals | taux de conversion par stage | `stage` |
| Deals | montant par pipeline | `pipeline` |
| Contacts | count par catégorie | `category` |
| Contacts | count par score de lead | `lead_score` |
| Activities | count par type | `entry_type` |
| Activities | count par membre | `user` |
| Quotes | `sum:amount` par statut | `status` |
| Quotes | taux d'acceptation | `status` |

#### Nouvelles métriques outil IA (generate_chart)
- `deals_amount_by_stage` — montant total par stage
- `deals_avg_amount_by_stage` — montant moyen par stage
- `deals_won_vs_lost` — gagnés vs perdus (count)
- `deals_amount_won_vs_lost` — gagnés vs perdus (montant)
- `deals_conversion_rate` — taux de conversion par stage
- `deals_duration_by_stage` — durée moyenne par stage
- `deals_amount_by_pipeline` — montant par pipeline
- `contacts_by_category` — contacts par catégorie
- `contacts_by_lead_score` — contacts par score
- `activities_by_type` — activités par type
- `activities_by_user` — activités par membre
- `quotes_amount_by_status` — montant devis par statut
- `quotes_acceptance_rate` — taux d'acceptation devis

#### Nouveaux types de charts
- `donut` — PieChart avec innerRadius
- `stacked_bar` — BarChart avec stackId
- `area` — AreaChart Recharts

#### Frontend — WidgetChart.tsx
- Ajouter le rendu pour `donut`, `stacked_bar`, `area`

#### Frontend — WidgetEditor.tsx
- Enrichir les listes de métriques et group_by par source
- Ajouter les 3 nouveaux types de charts
- Labels en français

#### Frontend — types/reports.ts
- Ajouter les nouveaux types et métriques

---

## Fichiers impactés

### Chantier 1
- `frontend/app/(auth)/register/page.tsx`
- `backend/accounts/views.py`
- `backend/organizations/views.py`

### Chantier 2
- `backend/reports/aggregation.py`
- `backend/chat/tools.py`
- `frontend/components/reports/WidgetChart.tsx`
- `frontend/components/reports/WidgetEditor.tsx`
- `frontend/types/reports.ts`
