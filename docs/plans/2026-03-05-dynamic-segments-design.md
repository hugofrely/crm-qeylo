# Dynamic Segments / Smart Lists - Design

## Overview

Segments dynamiques bases sur des criteres (champs contact, activite relationnelle, evenements temporels) pour le marketing cible. Les segments sont recalcules a chaque consultation via le Django ORM, avec compteurs caches dans Redis (TTL 1 min).

## Decisions

- **Criteres:** Champs contact + activite relationnelle + evenements temporels (option C)
- **Logique:** ET / OU avec groupes (pas de NOT explicite pour le MVP)
- **Dynamique:** Recalcul a chaque consultation (pas de snapshot)
- **UI:** Page dediee `/segments` + filtre dans la page contacts
- **Compteurs:** Caches Redis avec TTL de 60 secondes
- **Backend:** Traduction rules JSON -> Django ORM queryset

---

## 1. Modele de donnees

### Table `Segment`

| Champ | Type | Description |
|-------|------|-------------|
| id | UUID | PK |
| organization_id | FK -> Organization | Scope multi-tenant |
| created_by | FK -> User | Createur |
| name | CharField(255) | Nom du segment |
| description | TextField (nullable) | Description optionnelle |
| icon | CharField(50, nullable) | Icone lucide |
| color | CharField(7, nullable) | Couleur hex |
| rules | JSONField | Arbre de conditions |
| is_pinned | BooleanField (default=False) | Epingle dans la page contacts |
| order | IntegerField (default=0) | Ordre d'affichage |
| created_at | DateTimeField | Auto |
| updated_at | DateTimeField | Auto |

### Structure JSON des rules

```json
{
  "logic": "AND",
  "groups": [
    {
      "logic": "OR",
      "conditions": [
        {
          "field": "lead_score",
          "operator": "equals",
          "value": "hot"
        },
        {
          "field": "source",
          "operator": "equals",
          "value": "linkedin"
        }
      ]
    },
    {
      "logic": "AND",
      "conditions": [
        {
          "field": "created_at",
          "operator": "within_last",
          "value": 30,
          "unit": "days"
        }
      ]
    }
  ]
}
```

Le niveau racine combine les groupes avec AND ou OR. Chaque groupe combine ses conditions avec sa propre logique.

### Operateurs disponibles

| Type de champ | Operateurs |
|---------------|-----------|
| Texte | equals, not_equals, contains, not_contains, is_empty, is_not_empty |
| Nombre | equals, not_equals, greater_than, less_than, between |
| Date | equals, before, after, within_last, within_next, is_empty |
| Select/Enum | equals, not_equals, in, not_in |
| Boolean | is_true, is_false |
| Relation | has_any, has_none, count_greater_than, count_less_than |

### Champs filtrables

- **Contact direct:** first_name, last_name, email, phone, company, source, lead_score, job_title, city, country, industry, language, tags, categories
- **Dates:** created_at, updated_at, birthday
- **Custom fields:** `custom_field.{field_id}` (resolu dynamiquement)
- **Relations:** deals_count, open_deals_count, tasks_count, open_tasks_count, last_interaction_date
- **Temporels:** days_since_creation, days_since_last_interaction, has_deal_closing_within

### Cache des compteurs

Cle Redis: `segment:{segment_id}:count` avec TTL de 60 secondes.

---

## 2. API

### Endpoints

| Methode | URL | Description |
|---------|-----|-------------|
| GET | `/api/segments/` | Liste des segments (avec compteurs) |
| POST | `/api/segments/` | Creer un segment |
| GET | `/api/segments/{id}/` | Detail d'un segment |
| PUT | `/api/segments/{id}/` | Modifier un segment |
| DELETE | `/api/segments/{id}/` | Supprimer un segment |
| POST | `/api/segments/reorder/` | Reordonner les segments |
| GET | `/api/segments/{id}/contacts/` | Contacts du segment (pagine, 20/page) |
| POST | `/api/segments/preview/` | Preview: envoie des rules, retourne le count |

### Reponse type GET /api/segments/

```json
[
  {
    "id": "uuid",
    "name": "Contacts chauds ce mois",
    "description": "...",
    "icon": "flame",
    "color": "#ef4444",
    "rules": { "..." },
    "is_pinned": true,
    "order": 0,
    "contact_count": 42,
    "created_at": "...",
    "updated_at": "..."
  }
]
```

### Reponse GET /api/segments/{id}/contacts/

Meme format que `GET /api/contacts/` (reutilise le serializer Contact existant avec pagination).

### Reponse POST /api/segments/preview/

```json
{ "count": 15 }
```

### Moteur de regles - segments/engine.py

1. Parse l'arbre JSON des rules
2. Construit un `Q()` Django recursivement (groupes combines avec `&` ou `|`)
3. Gere les champs speciaux (custom fields via JSON lookup, relations via annotations/subqueries)
4. Retourne un queryset filtre sur `Contact.objects.filter(organization=org)`

---

## 3. Frontend

### Page dediee /segments

**Liste des segments:**
- Carte par segment: nom, icone, couleur, description, compteur
- Actions: editer, dupliquer, supprimer
- Bouton "Nouveau segment" -> ouvre le builder
- Drag & drop pour reordonner

**Segment builder (dialog):**
- Selecteur logique racine (ET / OU) entre les groupes
- Chaque groupe = bloc visuel avec:
  - Selecteur logique interne (ET / OU)
  - Liste de conditions: champ -> operateur -> valeur
  - Boutons ajouter/supprimer condition et groupe
- Preview en temps reel: compteur via `/preview/` (debounced 500ms)
- Champs nom, description, icone, couleur

**Vue contacts d'un segment (/segments/{id}):**
- Header avec nom, description, compteur, bouton "Modifier les regles"
- ContactTable reutilise (meme composant que /contacts)
- Pagination identique

### Integration dans la page contacts

- Selecteur "Segments" a cote des tabs de categories
- Dropdown listant les segments pinnes + "Voir tous les segments"
- Selection d'un segment filtre via `GET /api/segments/{id}/contacts/`
- Badge segment actif avec bouton pour retirer le filtre

### Sidebar

- Nouvelle entree "Segments" entre "Contacts" et "Pipeline" (icone ListFilter de Lucide)

### Composants a creer

| Composant | Role |
|-----------|------|
| SegmentList | Liste/grille des segments |
| SegmentCard | Carte d'un segment (nom, couleur, count) |
| SegmentBuilder | Dialog de creation/edition des regles |
| SegmentRuleGroup | Un groupe de conditions |
| SegmentConditionRow | Une ligne condition (field/operator/value) |
| SegmentPreviewCount | Compteur live pendant l'edition |
| SegmentSelector | Dropdown dans la page contacts |
