# Contacts: Tri, Filtres avancés & Actions en masse — Design

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Ajouter le tri par colonnes, les filtres avancés combinés (date + score + source + tags), et les actions en masse (supprimer, exporter, catégoriser, assigner entreprise) au module contacts. Tout côté API via query params, pas de vues sauvegardées.

**Approach:** Query params sur `GET /contacts/` pour tri et filtres. Un endpoint `POST /contacts/bulk-actions/` pour les actions en masse.

**Tech Stack:** Django 5 + DRF (backend), Next.js + shadcn/ui + Tailwind CSS 4 (frontend). Réutilisation des composants FilterBar/FilterPanel/FilterControls existants.

---

## 1. Tri par colonnes

### Backend

Le `ContactViewSet.get_queryset()` accepte un param `ordering` avec whitelist :

| Valeur | Champ |
|--------|-------|
| `last_name` / `-last_name` | Nom |
| `created_at` / `-created_at` | Date de création |
| `lead_score` / `-lead_score` | Lead score |
| `company` / `-company` | Entreprise |

Défaut : `-created_at`. Valeurs non autorisées ignorées (fallback défaut).

### Frontend

- En-têtes du `ContactTable` cliquables
- Clic toggle : ascendant -> descendant -> défaut
- Icône flèche indiquant la direction active
- State `ordering` dans le composant page, envoyé comme query param

### Fichiers impactés

- `backend/contacts/views.py` — ajouter parsing du param `ordering`
- `frontend/components/contacts/ContactTable.tsx` — en-têtes cliquables + icônes
- `frontend/app/(app)/contacts/page.tsx` — state `ordering` + passage au fetch

---

## 2. Filtres avancés combinés

### Backend

Nouveaux query params sur `GET /contacts/`, combinés en AND :

| Param | Type | Description |
|-------|------|-------------|
| `created_after` | date ISO | Filtrer après cette date |
| `created_before` | date ISO | Filtrer avant cette date |
| `lead_score` | string | `hot`, `warm`, ou `cold` |
| `source` | string | Valeur exacte du champ source |
| `tags` | string CSV | `tag1,tag2` — OU entre les tags |
| `category` | UUID | Existant |

Le filtre `tags` est en OR : un contact ayant au moins un des tags listés est retourné. Tous les autres filtres se combinent en AND.

### Frontend

Nouveaux composants de filtre dans FilterBar/FilterPanel :

| Filtre | Composant |
|--------|-----------|
| Date | `FilterDateRange` (existant) |
| Lead score | `FilterPills` multi-select (hot/warm/cold) |
| Source | `FilterSelect` avec valeurs dynamiques |
| Tags | Nouveau multi-select avec tags existants |

Le compteur de filtres actifs s'incrémente par filtre appliqué. Reset remet tout à zéro. L'export CSV existant intègre automatiquement les filtres actifs.

### Fichiers impactés

- `backend/contacts/views.py` — parsing des nouveaux params dans `get_queryset()`
- `frontend/app/(app)/contacts/page.tsx` — nouveaux states de filtres + passage au fetch
- `frontend/components/contacts/ContactTable.tsx` — si affichage des filtres actifs
- `frontend/services/contacts.ts` — mise à jour des signatures de fonctions fetch

---

## 3. Actions en masse

### Backend

Nouvel endpoint `POST /contacts/bulk-actions/` :

```json
{
  "action": "delete" | "export" | "categorize" | "assign_company",
  "ids": ["uuid1", "uuid2"],
  "params": {
    "category_ids": ["uuid"],
    "company_entity_id": "uuid"
  }
}
```

| Action | Comportement |
|--------|-------------|
| `delete` | Soft-delete via `queryset.update()` |
| `export` | Génère CSV des contacts sélectionnés |
| `categorize` | Ajoute les catégories (pas de remplacement) |
| `assign_company` | Met à jour `company_entity` sur les contacts |

Validation :
- Les IDs doivent appartenir à l'organisation courante
- Limite de 500 contacts max par action
- `params` validés selon l'action

### Frontend

La barre sticky existante s'enrichit de 4 boutons :

| Bouton | Comportement |
|--------|-------------|
| Supprimer | Appelle bulk endpoint (remplace la boucle actuelle) |
| Exporter | Télécharge CSV des sélectionnés |
| Catégoriser | Dialog pour choisir les catégories |
| Assigner entreprise | Dialog avec `FilterCompanySearch` existant |

Après chaque action : désélection + rafraîchissement de la liste.

### Fichiers impactés

- `backend/contacts/views.py` — nouvel endpoint `bulk_actions`
- `backend/contacts/urls.py` — nouvelle route
- `backend/contacts/serializers.py` — serializer pour validation du body
- `frontend/app/(app)/contacts/page.tsx` — nouveaux handlers d'actions
- `frontend/services/contacts.ts` — nouvelle fonction `bulkAction()`
- `frontend/components/contacts/ContactTable.tsx` — nouveaux boutons dans la barre sticky

---

## Décisions techniques

- **Pas de django-filter** : overhead inutile pour 4 filtres, query params manuels suffisent
- **Pas de vues sauvegardées** : hors scope
- **Tags en OR** : un contact avec au moins un des tags sélectionnés apparaît
- **Filtres combinés en AND** : date ET score ET source ET tags
- **Catégoriser = ajout** : les catégories existantes sont préservées
- **Limite bulk 500** : protection contre les abus
