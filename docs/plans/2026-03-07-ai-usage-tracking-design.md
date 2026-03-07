# AI Usage Tracking - Design Document

## Objectif

Suivre la consommation de ressources IA par organisation et par utilisateur pour estimer les couts. Dashboard admin avec breakdown par type d'appel, top consommateurs, et comparaison de periodes.

## Approche retenue

Log granulaire par appel IA (1 row par appel). Agregations SQL directes pour le dashboard — pas de pre-agregation ni de vue materialisee pour l'instant.

## Modele de donnees

### Table `AIUsageLog`

| Champ | Type | Description |
|-------|------|-------------|
| `id` | UUID | PK |
| `organization` | FK -> Organization | Le client/tenant |
| `user` | FK -> User | L'utilisateur qui a declenche l'appel |
| `call_type` | CharField (choices) | `chat`, `contact_summary`, `title_generation` |
| `model` | CharField(100) | Ex: `claude-sonnet-4-20250514` |
| `input_tokens` | IntegerField | Tokens envoyes |
| `output_tokens` | IntegerField | Tokens recus |
| `estimated_cost` | DecimalField(10, 6) | Cout estime en USD |
| `conversation` | FK -> Conversation (nullable) | Lien vers la conversation chat si applicable |
| `created_at` | DateTimeField(auto_now_add) | Timestamp |

Index: `(organization, created_at)`, `(user, created_at)`, `(call_type, created_at)`.

### Constantes de pricing

Fichier de config dans le code (`core/ai_pricing.py`):

```python
AI_PRICING = {
    "claude-sonnet-4-20250514": {"input": 3.00, "output": 15.00},  # USD par million tokens
    "claude-opus-4-6": {"input": 15.00, "output": 75.00},
}
```

## Backend

### Fonction utilitaire

`core/ai_tracking.py` — fonction `log_ai_usage(organization, user, call_type, model, usage, conversation=None)` qui calcule le cout et cree le log.

### Points d'instrumentation

1. **Chat** (`chat/views.py`) — apres `agent.run_sync()` et a la fin du stream SSE via `result.usage()`
2. **Resume contact** (`contacts/ai_summary.py`) — apres `agent.run_sync()`
3. **Generation de titre** (`chat/views.py`) — apres `agent.run()`

### Endpoints API

Tous proteges par `IsAuthenticated` + `is_superuser`.

| Methode | URL | Description |
|---------|-----|-------------|
| `GET` | `/api/ai-usage/summary/` | Totaux par orga, filtrable par periode |
| `GET` | `/api/ai-usage/by-user/` | Breakdown par utilisateur |
| `GET` | `/api/ai-usage/by-type/` | Breakdown par type d'appel |
| `GET` | `/api/ai-usage/timeline/` | Donnees pour graphique d'evolution (jour/semaine/mois) |
| `GET` | `/api/ai-usage/top-consumers/` | Top organisations et utilisateurs |

Query params communs: `start_date`, `end_date`, `organization_id` (optionnel), `user_id` (optionnel).

## Frontend

### Page `/settings/ai-usage`

#### Barre superieure
- Selecteur de periode (7j / 30j / 90j / personnalise)
- Filtre par organisation (dropdown)
- Filtre par utilisateur (dropdown, filtre par orga selectionnee)

#### KPIs en cartes
- Cout total (USD)
- Total tokens (input + output)
- Nombre d'appels
- Cout moyen par appel

#### Graphiques (recharts)
1. Evolution du cout — line chart par jour/semaine/mois
2. Repartition par type d'appel — pie/donut chart
3. Top 5 organisations — bar chart horizontal
4. Top 5 utilisateurs — bar chart horizontal

#### Tableau detaille
- Colonnes: Organisation, Utilisateur, Type, Tokens in/out, Cout, Date
- Tri et pagination

#### Comparaison de periodes
- Toggle pour afficher la periode precedente en overlay sur le line chart
- Pourcentage de variation sur les KPIs

### Design system
Coherent avec l'existant: shadcn + Tailwind + dark mode (next-themes).

## Acces et securite

- **Superuser**: acces complet a toutes les donnees
- **Utilisateur standard**: pas d'acces au dashboard AI usage
- Endpoints proteges par `IsAuthenticated` + verification `is_superuser`
- Lien visible uniquement pour les superusers dans la navigation
