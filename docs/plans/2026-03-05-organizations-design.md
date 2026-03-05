# Design : Gestion des organisations

**Date** : 2026-03-05

## Contexte

Le backend dispose deja d'un modele Organization, Membership (owner/admin/member) et Invitation. Le middleware resout l'organisation via le header `X-Organization`. Cote frontend, il n'existe aucun selecteur d'organisation ni de flow de creation lors de l'inscription.

## Objectif

- Permettre a l'utilisateur de choisir et switcher d'organisation depuis la sidebar
- Permettre de creer de nouvelles organisations depuis la sidebar
- A l'inscription, demander le nom de l'organisation au lieu de creer un workspace auto-nomme

## Decisions

| Question | Decision |
|---|---|
| Switch d'org | Dropdown dans la sidebar, change le header `X-Organization`, pas de refacto des routes |
| Refetch au switch | Simple refetch de toutes les donnees via une cle `orgVersion`, pas de cache cross-org |
| Creation d'org | Bouton "+ Nouvelle organisation" dans le dropdown de la sidebar |
| Inscription | Champ "Nom de votre organisation" ajoute au formulaire existant |

## Design

### 1. OrganizationProvider (nouveau context React)

- Wrappe le layout `(app)`
- Au mount : `GET /api/organizations/` pour recuperer la liste des orgs
- State : `currentOrganization`, `organizations[]`, `orgVersion` (compteur)
- Persiste l'org selectionnee dans un cookie `organization_id`
- `switchOrganization(orgId)` : met a jour le state + cookie + incremente `orgVersion`
- `createOrganization(name)` : `POST /api/organizations/`, ajoute a la liste, switch dessus

### 2. apiFetch (modification)

- Lit le cookie `organization_id` et injecte le header `X-Organization` sur chaque requete

### 3. Sidebar - Selecteur d'organisation (modification)

- Dropdown (`DropdownMenu` shadcn) en haut de la sidebar, au-dessus de la navigation
- Affiche : initiale de l'org dans un avatar carre + nom de l'org
- Liste des organisations avec check sur l'active
- Separateur + bouton "+ Creer une organisation" en bas

### 4. CreateOrgDialog (nouveau composant)

- Dialog shadcn avec un champ "Nom de l'organisation"
- Appelle `POST /api/organizations/`
- Switch automatiquement sur la nouvelle org a la creation

### 5. Formulaire d'inscription (modification)

- Ajout du champ "Nom de votre organisation" (obligatoire)
- Place apres nom/prenom, avant email/password

### 6. RegisterSerializer (modification backend)

- Accepte un nouveau champ `organization_name`
- Utilise ce nom pour creer l'organisation au lieu du nom auto-genere
- Le comportement d'auto-accept des invitations reste inchange

### 7. Hooks existants (modification legere)

- Les hooks (`useContacts`, `useDeals`, `useTasks`, etc.) ajoutent `orgVersion` du context dans leurs dependances `useEffect` pour refetch automatique au switch d'org

## Ce qui ne change pas

- Pas de nouveau modele ni de migration
- Pas de nouveau endpoint API
- Pas de refacto des routes (pas de prefixe `/org/{slug}/`)
- Le middleware backend existant continue de resoudre `X-Organization`

## Fichiers impactes

| Fichier | Type |
|---|---|
| `frontend/lib/organization.tsx` | Nouveau - OrganizationProvider |
| `frontend/lib/api.ts` | Modif - header X-Organization |
| `frontend/components/Sidebar.tsx` | Modif - dropdown org |
| `frontend/components/organizations/CreateOrgDialog.tsx` | Nouveau |
| `frontend/app/(app)/layout.tsx` | Modif - wrap OrganizationProvider |
| `frontend/app/(auth)/register/page.tsx` | Modif - champ org name |
| `backend/accounts/serializers.py` | Modif - champ organization_name |
| `backend/accounts/views.py` | Modif - utiliser organization_name |
| `frontend/hooks/*.ts` | Modif legere - dependance orgVersion |
