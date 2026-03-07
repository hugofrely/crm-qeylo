# Filter System Redesign

## Objectif

Revoir le système de filtres frontend pour :
- Ajouter une recherche texte sur toutes les pages avec filtres
- Sur desktop (lg+) : afficher tous les filtres inline dans une barre horizontale sous le header
- Sur mobile (< lg) : garder le système actuel (bouton + drawer latéral)

## Architecture

### Approche choisie : Composant FilterBar séparé

Créer un nouveau composant `FilterBar` pour desktop, conserver `FilterPanel` (drawer) pour mobile. Les deux coexistent, contrôlés par des classes responsive (`hidden lg:flex` / `lg:hidden`).

### Nouveaux composants

**`FilterBar`** (`components/shared/FilterBar.tsx`)
- Conteneur `hidden lg:flex flex-wrap gap-2 items-center`
- Placé entre le PageHeader et le contenu principal
- Bouton "Réinitialiser" visible quand `activeFilterCount > 0`

**Sous-composants réutilisables de filtre** (utilisés par FilterBar et FilterPanel) :
- `FilterSearchInput` — champ recherche avec icône Search
- `FilterPills` — groupe de pills toggleables (priorité, statut, catégories courtes)
- `FilterSelect` — select natif pour listes longues
- `FilterContactSearch` — autocomplete contact (réutilise `useContactAutocomplete`)
- `FilterDateRange` — paire de champs date
- `FilterNumberRange` — paire de champs number

### Modifications existantes

- `FilterTriggerButton` : ajouter `lg:hidden`
- `FilterPanel` (drawer) : ajouter `lg:hidden` sur backdrop + drawer

## Pages concernées

| Page | Recherche | Filtres inline desktop |
|------|-----------|----------------------|
| Contacts | Rechercher un contact | Catégorie (pills), Segment (select) |
| Tâches | Rechercher une tâche (nouveau) | Priorité (pills), Échéance (pills), Contact (autocomplete), Assigné (autocomplete + "Mes tâches" pill) |
| Deals | Rechercher un deal (nouveau) | Contact (autocomplete), Montant (number range), Probabilité (number range), Date closing (date range), Date création (date range), Créé par (select) |
| Produits | Rechercher un produit | Catégorie (select), Statut (pills) |
| Funnel | — | Pipeline (select), Mode (pills), Période (select) |
| Email Templates | Rechercher un template | Visibilité (pills) |

## Backend

- **Tâches** : ajouter paramètre `search` au endpoint de listing
- **Deals** : ajouter paramètre `search` au endpoint de listing

## Responsive

- Desktop (lg+) : `FilterBar` visible, `FilterTriggerButton` + `FilterPanel` cachés
- Mobile/Tablette (< lg) : `FilterBar` caché, `FilterTriggerButton` + `FilterPanel` visibles (comportement actuel inchangé)
