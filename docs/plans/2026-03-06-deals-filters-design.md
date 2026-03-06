# Filtres sur la page Deals (Pipeline Kanban)

## Objectif

Ajouter un panneau de filtres (drawer latéral) sur la page `/deals` pour filtrer les deals affichés dans le kanban board.

## Filtres

| Filtre | Type | Query param backend |
|--------|------|-------------------|
| Contact | Sélection contact | `contact` |
| Montant min | Nombre | `amount_min` |
| Montant max | Nombre | `amount_max` |
| Probabilité min | Nombre | `probability_min` |
| Probabilité max | Nombre | `probability_max` |
| Date closing après | Date | `expected_close_after` |
| Date closing avant | Date | `expected_close_before` |
| Date création après | Date | `created_after` |
| Date création avant | Date | `created_before` |
| Créé par | Sélection user | `created_by` |

## Architecture

### Backend (`deals/views.py` — `pipeline_view`)

Ajouter le filtrage des deals dans chaque stage via query params. Filtrer le queryset `deals` avant de construire la réponse.

### Frontend

- Réutiliser `FilterPanel`, `FilterTriggerButton`, `FilterSection` de `components/shared/FilterPanel.tsx`
- Ajouter le bouton filtre dans le `PageHeader` de la page deals
- Passer les filtres au hook `usePipeline` → `fetchPipeline` en query params
- État des filtres géré dans la page deals, passé au `KanbanBoard` via le hook

### Composants UI

- Contact : `<select>` avec liste des contacts (fetch existant)
- Montant / Probabilité : inputs numériques min/max
- Dates : inputs `type="date"`
- Créé par : `<select>` avec liste des membres de l'organisation
