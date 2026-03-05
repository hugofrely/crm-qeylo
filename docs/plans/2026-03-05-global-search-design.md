# Recherche Globale — Design

> **Pour Claude :** REQUIRED SUB-SKILL : Use superpowers:executing-plans to implement this plan task-by-task.

**Goal :** Ajouter une barre de recherche unifiee dans un header sticky (contacts + deals + taches) avec un endpoint backend unique.

**Architecture :** Un endpoint `GET /api/search/?q=` cote backend qui recherche en parallele dans les 3 entites et retourne les resultats groupes. Cote frontend, un composant `SearchHeader` avec input + dropdown de resultats, integre dans le layout au-dessus du contenu.

**Tech Stack :** Django REST Framework, Next.js 16, React 19, Tailwind CSS 4, lucide-react

---

## 1. Backend — Endpoint unifie

### Endpoint

```
GET /api/search/?q=<query>
```

### Response

```json
{
  "contacts": [
    {"id": "uuid", "first_name": "Jean", "last_name": "Dupont", "company": "Acme", "email": "jean@acme.com"}
  ],
  "deals": [
    {"id": "uuid", "name": "Contrat Acme", "amount": "50000.00", "stage_name": "Negociation", "contact_name": "Jean Dupont"}
  ],
  "tasks": [
    {"id": "uuid", "description": "Rappeler Jean", "priority": "high", "due_date": "2026-03-10", "is_done": false, "contact_name": "Jean Dupont"}
  ]
}
```

### Logique de recherche

- **Contacts** : `first_name`, `last_name`, `company`, `email` — `icontains` par mot (AND entre mots)
- **Deals** : `name`, `notes`, `contact__first_name`, `contact__last_name`
- **Tasks** : `description`, `contact__first_name`, `contact__last_name`, `deal__name`
- Chaque categorie limitee a **5 resultats**
- Scope : `organization` du user authentifie
- Query minimum : 2 caracteres (sinon retourne vide)

### Implementation

- Vue fonction `global_search` dans un fichier `backend/search/views.py` (nouvelle app Django legere) ou directement une vue dans `config/`
- Reutilise le pattern Q() OR-chaining de `search_contacts`
- URL enregistree dans `config/urls.py`

---

## 2. Frontend — Top header avec search bar

### Layout

```
┌──────────┬─────────────────────────────────┐
│          │  [🔍 Rechercher...]    [notif]  │
│  Sidebar │─────────────────────────────────│
│          │                                 │
│          │         Page content             │
│          │                                 │
└──────────┴─────────────────────────────────┘
```

- Le layout `app/(app)/layout.tsx` passe de `sidebar + contenu` a `sidebar + (header + contenu)`
- Le header est **sticky** (reste visible au scroll)
- `NotificationBell` migre de la sidebar vers le header

### Search bar

- Input avec placeholder "Rechercher contacts, deals, taches..."
- Debounce **300ms** sur la frappe
- Raccourci clavier `Cmd+K` / `Ctrl+K` pour focus
- Query minimum 2 caracteres avant appel API

### Dropdown resultats

- S'affiche sous la search bar quand il y a des resultats
- Groupe par categorie avec labels : "Contacts", "Pipeline", "Taches"
- Icones lucide-react : `User` (contacts), `Kanban` (deals), `CheckSquare` (taches)
- Chaque resultat montre : nom/titre + metadata secondaire (company, stage, priority...)
- Se ferme au clic exterieur, Escape, ou navigation
- Message "Aucun resultat" si query sans match

### Navigation au clic

- Contact → `router.push("/contacts/{id}")`
- Deal → `router.push("/deals")`
- Task → `router.push("/tasks")`

---

## 3. Composants

| Composant | Action |
|---|---|
| `SearchHeader.tsx` (nouveau) | Input + dropdown + NotificationBell |
| `app/(app)/layout.tsx` | Integre SearchHeader au-dessus du contenu |
| `Sidebar.tsx` | Retire NotificationBell (migre vers header) |
