# Deal Management — Création & Édition manuelle dans le pipeline

**Date :** 2026-03-04

## Contexte

Le pipeline Kanban affiche les deals par stage avec drag-and-drop, mais aucune UI ne permet de créer, voir les détails, modifier ou supprimer un deal. Le backend CRUD existe déjà (POST/PATCH/DELETE sur `/api/deals/`).

## Design

### Composant `DealDialog`

Modale partagée création/édition dans `frontend/components/deals/DealDialog.tsx`.

**Champs du formulaire :**

| Champ | Type | Requis | Notes |
|-------|------|--------|-------|
| Nom | texte | oui | |
| Montant (€) | nombre | oui | |
| Stage | select | oui | Liste des stages du pipeline |
| Contact | select | non | Liste des contacts de l'org |
| Probabilité (%) | nombre 0-100 | non | |
| Date de clôture | date | non | |
| Notes | textarea | non | |

**Modes :**

- **Création** : titre "Nouveau deal", bouton "Créer" → POST `/api/deals/`
- **Édition** : titre "Modifier le deal", bouton "Enregistrer" → PATCH `/api/deals/{id}/`
- **Suppression** : bouton rouge en mode édition → DELETE `/api/deals/{id}/` avec confirmation

### Intégration dans le pipeline

- Bouton "+ Nouveau deal" en haut de la page (dans le header de `deals/page.tsx`)
- Clic sur un DealCard → ouvre la modale en mode édition
- Après toute action réussie → refresh du pipeline

### Fix backend

- Ajout de `contact_name` au `PipelineDealSerializer` (concaténation first_name + last_name)

### Pas de changements

- Pas de nouvelle dépendance npm
- Pas de nouveau endpoint API
- Pas de migration
