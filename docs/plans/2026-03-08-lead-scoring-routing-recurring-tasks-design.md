# Design: Lead Scoring, Lead Routing, Tâches Récurrentes

**Date:** 2026-03-08
**Status:** Approved

## Scope

3 fonctionnalités manquantes identifiées par audit :

1. Lead scoring automatique (0-100)
2. Lead routing (round-robin + règles)
3. Tâches récurrentes (création au fil de l'eau)

Les séquences de vente sont exclues (module `sequences/` déjà fonctionnel).

---

## 1. Lead Scoring Automatique

### Modèle de données

- `Contact.numeric_score` — IntegerField (0-100, default=0)
- `Contact.lead_score` — existant (HOT/WARM/COLD), désormais calculé automatiquement à partir du score numérique
- `ScoringRule` — nouveau modèle :
  - `organization` (FK)
  - `event_type` (CharField choices: email_sent, email_opened, email_clicked, call_made, call_answered, deal_created, deal_won, meeting, note_added, task_completed, inactivity_7d, inactivity_30d)
  - `points` (IntegerField, positif ou négatif)
  - `is_active` (BooleanField)
  - `created_at`
- Seuils dans `OrganizationSettings` :
  - `scoring_hot_threshold` (IntegerField, default=70)
  - `scoring_warm_threshold` (IntegerField, default=30)

### Logique

- `recalculate_score(contact)` : somme les points des activités récentes, applique le decay, clamp 0-100, met à jour `lead_score`
- Signals Django sur TimelineEntry, Call, Deal pour déclencher le recalcul
- Celery beat quotidien pour le decay d'inactivité
- Règles par défaut créées à l'inscription d'une organisation

### Frontend

- Badge score numérique coloré sur fiche contact (vert/orange/rouge)
- Page settings `/settings/scoring` pour configurer règles et seuils
- Colonne score dans la liste des contacts, triable

---

## 2. Lead Routing

### Modèle de données

- `Contact.owner` — FK vers User (nullable), le propriétaire assigné
- `LeadRoutingRule` — nouveau modèle :
  - `organization` (FK)
  - `name` (CharField)
  - `priority` (IntegerField) — ordre d'évaluation
  - `conditions` (JSONField) — ex: `{"source": "website", "industry": "tech"}`
  - `assign_to` (FK vers User)
  - `is_active` (BooleanField)
  - `created_at`
- `RoundRobinState` — nouveau modèle :
  - `organization` (OneToOne)
  - `last_assigned_index` (IntegerField, default=0)
  - `eligible_users` (M2M vers User)

### Logique

- `route_lead(contact)` : parcourt les règles par priorité, match les conditions contre les champs du contact. Si match → assigne. Sinon → round-robin parmi les `eligible_users`.
- Appelée via signal `post_save` sur Contact (uniquement à la création, si `owner` est null)
- Conditions supportées : source, industry, lead_score, estimated_budget (gte/lte), country, tags (contains)

### Frontend

- Page settings `/settings/routing` pour gérer les règles et les utilisateurs éligibles au round-robin
- Affichage du propriétaire sur la fiche contact et dans la liste

---

## 3. Tâches Récurrentes

### Logique

- Signal `pre_save` sur Task : quand `is_done` passe de False à True et `is_recurring=True`, créer la prochaine occurrence
- La nouvelle tâche copie : description, priority, contact, deal, assignees, is_recurring, recurrence_rule
- `due_date` calculée en parsant `recurrence_rule` :
  - `DAILY` → +1 jour
  - `WEEKLY` → +7 jours
  - `MONTHLY` → +1 mois
  - `WEEKLY;BYDAY=MO,WE,FR` → prochain jour listé après la date actuelle

### Frontend (TaskDialog)

- Sélecteur de récurrence dans le formulaire de création/édition :
  - Checkbox "Tâche récurrente"
  - Dropdown : Quotidien, Hebdomadaire, Mensuel, Personnalisé
  - Si Personnalisé → sélection des jours de la semaine
- Badge "↻" ou icône récurrence dans la liste des tâches
- Pas de modification du format `recurrence_rule` (déjà CharField)

---

## Hors scope

- Scoring par IA/ML
- Routing multi-pipeline
- Séquences de vente (déjà existantes)
- Création de tâches récurrentes à l'avance
