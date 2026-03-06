# AI Chat Tools Upgrade - Design Document

## Objectif

Mettre a jour l'ensemble des tools du chat IA pour couvrir le CRUD complet de toutes les entites, ajouter la navigation, les requetes dynamiques avec sauvegarde en segment, et la generation de charts inline.

## Decisions de design

- **Navigation** : liens cliquables (pas de redirection automatique)
- **Action cards** : resume de l'action + mini apercu de l'entite
- **Suppression** : soft delete direct + bouton undo dans la card
- **Charts** : inline dans le chat, tous types Recharts, config structuree retournee par le tool
- **CRUD** : couverture complete y compris sous-elements (stages, categories, nodes workflow)
- **Lib charts** : Recharts (deja installe)
- **Approche** : hybride — tools granulaires groupes intelligemment, extension de l'existant

## Architecture

### Backend — Tools (47 total)

Framework : Pydantic AI, tools definis dans `backend/chat/tools.py`.

#### Contacts (10 tools)

| Tool | Statut | Description |
|------|--------|-------------|
| `create_contact` | Existe | Creer un contact avec detection de doublons |
| `search_contacts` | Existe | Rechercher par nom, company, email |
| `update_contact` | Existe | Modifier les champs d'un contact |
| `update_contact_categories` | Existe | Definir les categories d'un contact |
| `update_custom_field` | Existe | Modifier un champ personnalise |
| `delete_contact` | Nouveau | Soft delete + retourne id pour undo |
| `get_contact` | Nouveau | Detail complet pour apercu dans les cards |
| `list_contact_categories` | Nouveau | Lister les categories disponibles |
| `create_contact_category` | Nouveau | Creer une categorie |
| `delete_contact_category` | Nouveau | Supprimer une categorie |

#### Deals (10 tools)

| Tool | Statut | Description |
|------|--------|-------------|
| `create_deal` | Existe | Creer un deal dans un pipeline |
| `move_deal` | Existe | Deplacer un deal vers un autre stage |
| `update_deal` | Nouveau | Modifier nom, montant, contact lie |
| `delete_deal` | Nouveau | Soft delete + undo |
| `get_deal` | Nouveau | Detail complet pour apercu |
| `search_deals` | Nouveau | Rechercher par nom, montant, stage |
| `list_pipeline_stages` | Nouveau | Lister les stages d'un pipeline |
| `create_pipeline_stage` | Nouveau | Ajouter un stage |
| `update_pipeline_stage` | Nouveau | Modifier un stage |
| `delete_pipeline_stage` | Nouveau | Supprimer un stage |

#### Tasks (5 tools)

| Tool | Statut | Description |
|------|--------|-------------|
| `create_task` | Existe | Creer une tache/rappel |
| `complete_task` | Existe | Marquer une tache comme faite |
| `update_task` | Nouveau | Modifier description, date, priorite, liens |
| `delete_task` | Nouveau | Soft delete + undo |
| `search_tasks` | Nouveau | Rechercher/filtrer les taches |

#### Segments (4 tools)

| Tool | Statut | Description |
|------|--------|-------------|
| `update_segment` | Nouveau | Modifier un segment |
| `delete_segment` | Nouveau | Supprimer un segment |
| `list_segments` | Nouveau | Lister les segments |
| `get_segment_contacts` | Nouveau | Obtenir les contacts d'un segment |

Note : la creation de segment passe par `query_contacts` + bouton "Sauvegarder comme segment" dans l'action card.

#### Workflows (6 tools)

| Tool | Statut | Description |
|------|--------|-------------|
| `create_workflow` | Existe | Creer un workflow avec trigger, conditions, actions |
| `list_workflows` | Existe | Lister les workflows |
| `toggle_workflow` | Existe | Activer/desactiver un workflow |
| `get_workflow_executions` | Existe | Historique d'execution |
| `update_workflow` | Nouveau | Modifier nom, description, nodes, edges |
| `delete_workflow` | Nouveau | Supprimer un workflow |

#### Email Templates (5 tools)

| Tool | Statut | Description |
|------|--------|-------------|
| `list_email_templates` | Existe | Lister les templates |
| `send_email_from_template` | Existe | Envoyer un email depuis un template |
| `create_email_template` | Nouveau | Creer un template (name, subject, body_html, tags) |
| `update_email_template` | Nouveau | Modifier un template |
| `delete_email_template` | Nouveau | Supprimer un template |

#### Timeline/Events (5 tools)

| Tool | Statut | Description |
|------|--------|-------------|
| `add_note` | Existe | Ajouter une note |
| `log_interaction` | Existe | Logger une interaction |
| `update_note` | Nouveau | Modifier une note |
| `delete_note` | Nouveau | Supprimer une note |
| `list_timeline` | Nouveau | Lister les evenements d'un contact/deal |

#### Tools transversaux (4 tools)

| Tool | Statut | Description |
|------|--------|-------------|
| `navigate` | Nouveau | Retourner un lien cliquable vers une page |
| `generate_chart` | Nouveau | Requeter les donnees + retourner une config chart |
| `query_contacts` | Nouveau | Requete dynamique avec option sauvegarder en segment |
| `get_dashboard_summary` | Existe | Metriques dashboard |
| `search_all` | Existe | Recherche globale |

### Format de retour enrichi

Tous les tools retournent un dict avec une structure enrichie pour les action cards :

```python
# Convention commune
{
    "action": str,           # ex: "contact_created", "deal_updated", "chart_generated"
    "entity_type": str,      # ex: "contact", "deal", "contact_list", "chart"
    "summary": str,          # description humaine de l'action
    # Champs optionnels selon le type d'action :
    "entity_id": str,        # UUID de l'entite
    "entity_preview": dict,  # apercu des champs cles
    "changes": list,         # [{"field": "...", "from": "...", "to": "..."}]
    "link": str,             # path de navigation
    "undo_available": bool,  # pour les suppressions
    "save_as_segment_available": bool,  # pour query_contacts
    "rules": dict,           # regles de filtrage pour sauvegarde segment
    "chart": dict,           # config chart structuree
}
```

#### Exemples par type d'action

**Creation :**
```python
{
    "action": "contact_created",
    "entity_type": "contact",
    "entity_id": "uuid-123",
    "summary": "Contact cree",
    "entity_preview": {
        "name": "Jean Dupont",
        "email": "jean@example.com",
        "company": "Acme Corp",
        "phone": "+33 6 12 34 56 78",
        "avatar_initials": "JD"
    },
    "link": "/contacts/uuid-123"
}
```

**Mise a jour :**
```python
{
    "action": "deal_updated",
    "entity_type": "deal",
    "entity_id": "uuid-456",
    "summary": "Deal mis a jour",
    "changes": [
        {"field": "amount", "from": "5000EUR", "to": "8000EUR"},
        {"field": "stage", "from": "Negociation", "to": "Proposition"}
    ],
    "entity_preview": {
        "name": "Contrat Acme",
        "amount": "8 000EUR",
        "stage": "Proposition",
        "contact": "Jean Dupont"
    },
    "link": "/deals/uuid-456"
}
```

**Suppression :**
```python
{
    "action": "contact_deleted",
    "entity_type": "contact",
    "entity_id": "uuid-123",
    "summary": "Contact supprime",
    "entity_preview": {
        "name": "Jean Dupont",
        "email": "jean@example.com"
    },
    "undo_available": True
}
```

**Requete dynamique :**
```python
{
    "action": "contacts_queried",
    "entity_type": "contact_list",
    "summary": "12 contacts avec un deal arrivant a echeance",
    "count": 12,
    "results": [
        {"id": "...", "name": "Jean Dupont", "email": "...", "company": "Acme", "extra": "Deal: Contrat Acme - echeance 15/03"}
    ],
    "rules": { ... },
    "save_as_segment_available": True
}
```

**Chart :**
```python
{
    "action": "chart_generated",
    "chart": {
        "type": "bar",
        "title": "Deals crees par mois",
        "data": [{"label": "Jan", "value": 12}, {"label": "Fev", "value": 18}],
        "xKey": "label",
        "series": [{"key": "value", "label": "Deals", "color": "#6366f1"}]
    }
}
```

**Navigation :**
```python
{
    "action": "navigation",
    "entity_type": "contact",
    "link": "/contacts/uuid-123",
    "title": "Jean Dupont",
    "description": "Contact - jean@example.com - Acme Corp"
}
```

### Tool `generate_chart`

#### Parametres

```python
def generate_chart(
    ctx: RunContext[ChatDeps],
    metric: str,          # ce qu'on mesure
    chart_type: str,      # "bar", "line", "pie", "area", "funnel", "radar", "composed"
    period: Optional[str] = None,    # "7d", "30d", "90d", "12m", "ytd", "all"
    group_by: Optional[str] = None,  # "day", "week", "month", "stage", "source", "category", "priority"
    filters: Optional[dict] = None,  # filtres additionnels
) -> dict:
```

#### Metriques supportees

| Metrique | Description | Group by par defaut |
|----------|-------------|-------------------|
| `deals_count` | Nombre de deals | month |
| `deals_amount` | Montant total des deals | month |
| `deals_by_stage` | Repartition par stage | stage |
| `contacts_count` | Nombre de contacts crees | month |
| `contacts_by_source` | Repartition par source | source |
| `contacts_by_category` | Repartition par categorie | category |
| `tasks_count` | Nombre de taches | month |
| `tasks_by_priority` | Repartition par priorite | priority |
| `tasks_completion_rate` | Taux de completion | month |
| `revenue_over_time` | Revenus (deals gagnes) | month |
| `pipeline_funnel` | Funnel du pipeline | stage |
| `emails_sent` | Emails envoyes | month |
| `workflow_executions` | Executions de workflows | month |

#### Retour

Config chart structuree avec `type`, `title`, `data`, `xKey`, `series` (chaque serie a `key`, `label`, `color`). Le frontend rend directement sans interpretation du LLM.

### Tool `query_contacts`

```python
def query_contacts(
    ctx: RunContext[ChatDeps],
    filters: dict,         # regles de filtrage style segment rules
    sort_by: Optional[str] = None,
    limit: Optional[int] = 20,
) -> dict:
```

Reutilise le moteur de filtrage des segments. Les `filters` suivent le meme format que `Segment.rules` pour que le bouton "Sauvegarder comme segment" puisse passer les rules directement a `POST /api/segments/`.

### Tool `navigate`

```python
def navigate(
    ctx: RunContext[ChatDeps],
    destination: str,      # "contact", "deal", "task", "segment", "workflow",
                           # "email_template", "dashboard", "reports", "settings",
                           # "pipeline", "trash", "products"
    entity_id: Optional[str] = None,
) -> dict:
```

Resout le bon path selon la destination et l'id. Retourne `link`, `title`, `description`.

### Frontend — Action Cards (refacto)

#### Architecture des composants

```
ActionCard (dispatcher)
  +-- EntityCreatedCard    : apercu entite + lien + icone par type
  +-- EntityUpdatedCard    : apercu entite + diff (avant -> apres) + lien
  +-- EntityDeletedCard    : apercu entite + bouton "Annuler"
  +-- ContactListCard      : tableau de resultats + bouton "Sauvegarder comme segment"
  +-- ChartCard            : composant Recharts dynamique
  +-- NavigationCard       : lien cliquable avec apercu de la destination
  +-- ErrorCard            : message d'erreur stylise
```

#### EntityCreatedCard / EntityUpdatedCard
- Icone par type d'entite (contact = user, deal = dollar, task = check, etc.)
- Badge colore avec le type (Contact, Deal, Task...)
- Apercu des champs cles (2-4 champs selon le type)
- Pour les updates : liste des changements `champ: ancien -> nouveau`
- Lien cliquable "Voir le contact ->"

#### EntityDeletedCard
- Apercu en style attenue/barre
- Bouton "Annuler la suppression" qui appelle `POST /api/trash/{id}/restore/`

#### ContactListCard
- Mini tableau avec les resultats (nom, email, infos cles)
- Compteur "12 contacts trouves"
- Bouton "Sauvegarder comme segment" qui appelle `POST /api/segments/` avec les rules
- Chaque ligne cliquable vers le contact

#### ChartCard + DynamicChart
- Composant `DynamicChart` qui prend la config structuree et rend le bon type Recharts
- Supporte tous les types Recharts : BarChart, LineChart, PieChart, AreaChart, FunnelChart, RadarChart, ComposedChart, etc.
- Titre, legende, tooltips inclus
- Responsive dans la bulle de chat

#### NavigationCard
- Icone de la page destination
- Titre + description courte
- Lien cliquable stylise

## Fichiers impactes

### Backend
- `backend/chat/tools.py` — ajout des 24 nouveaux tools, enrichissement du format de retour des 23 existants
- `backend/chat/agent.py` — mise a jour de ALL_TOOLS si necessaire

### Frontend
- `frontend/components/chat/ActionCard.tsx` — refacto complete en dispatcher
- `frontend/components/chat/EntityCreatedCard.tsx` — nouveau
- `frontend/components/chat/EntityUpdatedCard.tsx` — nouveau
- `frontend/components/chat/EntityDeletedCard.tsx` — nouveau
- `frontend/components/chat/ContactListCard.tsx` — nouveau
- `frontend/components/chat/ChartCard.tsx` — nouveau
- `frontend/components/chat/DynamicChart.tsx` — nouveau
- `frontend/components/chat/NavigationCard.tsx` — nouveau
- `frontend/components/chat/ErrorCard.tsx` — nouveau
- `frontend/types/chat.ts` — types pour les nouvelles structures de retour
