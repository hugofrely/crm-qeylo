# FreelanceCRM (Qeylo) — Design Document

**Date:** 2026-03-04
**Status:** Approved
**Tagline:** "Dis-le. C'est fait."

---

## Vision

CRM conversationnel pour freelances et indépendants. Zéro formulaire. L'utilisateur parle en langage naturel, l'IA structure tout automatiquement : contacts, deals, rappels. Interface chat hybride plein écran avec cartes inline interactives + vues dédiées classiques.

---

## Stack Technique

| Composant | Technologie |
|---|---|
| Frontend | Next.js App Router + shadcn/ui + Tailwind CSS |
| Backend | Django + Django REST Framework |
| IA | Pydantic AI avec tools, streaming SSE |
| Modèle IA | Configurable via `.env` — Claude par défaut, fallback GPT |
| Base de données | PostgreSQL 16 (Docker) |
| Auth | Django auth natif + djangorestframework-simplejwt (email/password) |
| Infra dev | Docker Compose avec hot-reload |
| Déploiement | Docker (tout conteneurisé) |

---

## Architecture

Monorepo avec frontend/ et backend/ dans un Docker Compose.

```
crm-qeylo/
├── docker-compose.yml
├── .env.example
├── frontend/                  # Next.js
│   ├── Dockerfile.dev
│   ├── app/
│   │   ├── (auth)/
│   │   │   ├── login/page.tsx
│   │   │   ├── register/page.tsx
│   │   │   └── layout.tsx
│   │   ├── (app)/
│   │   │   ├── layout.tsx
│   │   │   ├── chat/page.tsx
│   │   │   ├── contacts/
│   │   │   │   ├── page.tsx
│   │   │   │   └── [id]/page.tsx
│   │   │   ├── deals/
│   │   │   │   ├── page.tsx
│   │   │   │   └── [id]/page.tsx
│   │   │   ├── tasks/page.tsx
│   │   │   ├── dashboard/page.tsx
│   │   │   └── settings/
│   │   │       ├── page.tsx
│   │   │       ├── pipeline/page.tsx
│   │   │       └── organization/page.tsx
│   │   └── layout.tsx
│   ├── components/
│   │   ├── ui/                # shadcn components
│   │   ├── chat/
│   │   │   ├── ChatWindow.tsx
│   │   │   ├── ChatInput.tsx
│   │   │   ├── ChatMessage.tsx
│   │   │   ├── ActionCard.tsx
│   │   │   ├── ConfirmActions.tsx
│   │   │   └── StreamingText.tsx
│   │   ├── contacts/
│   │   │   ├── ContactTable.tsx
│   │   │   ├── ContactCard.tsx
│   │   │   └── ContactTimeline.tsx
│   │   ├── deals/
│   │   │   ├── KanbanBoard.tsx
│   │   │   ├── KanbanColumn.tsx
│   │   │   └── DealCard.tsx
│   │   ├── tasks/
│   │   │   └── TaskList.tsx
│   │   └── dashboard/
│   │       ├── StatCard.tsx
│   │       └── RevenueChart.tsx
│   └── lib/
│       └── api.ts
├── backend/                   # Django
│   ├── Dockerfile.dev
│   ├── manage.py
│   ├── requirements.txt
│   ├── config/
│   │   ├── settings.py
│   │   ├── urls.py
│   │   └── wsgi.py
│   ├── accounts/              # Auth + User model
│   ├── organizations/         # Organization + Membership
│   ├── contacts/              # Contacts
│   ├── deals/                 # Deals + Pipeline stages
│   ├── tasks/                 # Rappels & tâches
│   ├── notes/                 # Notes + Timeline
│   ├── chat/                  # Chat IA (Pydantic AI + tools)
│   └── dashboard/             # Dashboard stats
└── nginx/                     # Reverse proxy (optionnel)
```

---

## Modèle de Données

### Organization
| Champ | Type | Notes |
|---|---|---|
| id | UUID | PK |
| name | varchar(255) | |
| slug | varchar(100) | unique |
| siret | varchar(14) | optionnel |
| logo_url | varchar(500) | optionnel |
| created_at | datetime | auto |

### User (extends AbstractUser)
| Champ | Type | Notes |
|---|---|---|
| id | UUID | PK |
| email | varchar(254) | unique, utilisé comme username |
| password | hash | Django auth |
| first_name | varchar(150) | |
| last_name | varchar(150) | |
| created_at | datetime | auto |

### Membership
| Champ | Type | Notes |
|---|---|---|
| id | UUID | PK |
| organization_id | FK Organization | |
| user_id | FK User | |
| role | enum | owner / admin / member |
| joined_at | datetime | auto |
| **unique_together** | | (organization_id, user_id) |

### Contact
| Champ | Type | Notes |
|---|---|---|
| id | UUID | PK |
| organization_id | FK Organization | |
| created_by | FK User | |
| first_name | varchar(150) | |
| last_name | varchar(150) | |
| email | varchar(254) | optionnel |
| phone | varchar(20) | optionnel |
| company | varchar(255) | optionnel |
| source | varchar(100) | optionnel (recommandation, LinkedIn, etc.) |
| tags | JSONField | liste de strings |
| notes | text | optionnel |
| created_at | datetime | auto |
| updated_at | datetime | auto |

### PipelineStage
| Champ | Type | Notes |
|---|---|---|
| id | UUID | PK |
| organization_id | FK Organization | |
| name | varchar(100) | |
| order | int | pour le tri |
| color | varchar(7) | hex color |

Stages par défaut créés à l'inscription :
1. Premier contact (#6366F1)
2. En discussion (#F59E0B)
3. Devis envoyé (#3B82F6)
4. Négociation (#8B5CF6)
5. Gagné (#10B981)
6. Perdu (#EF4444)

### Deal
| Champ | Type | Notes |
|---|---|---|
| id | UUID | PK |
| organization_id | FK Organization | |
| created_by | FK User | |
| name | varchar(255) | |
| amount | decimal(12,2) | |
| stage | FK PipelineStage | |
| contact | FK Contact | nullable pour MVP |
| probability | int | 0-100, optionnel |
| expected_close | date | optionnel |
| notes | text | optionnel |
| created_at | datetime | auto |
| updated_at | datetime | auto |
| closed_at | datetime | nullable |

### Task
| Champ | Type | Notes |
|---|---|---|
| id | UUID | PK |
| organization_id | FK Organization | |
| created_by | FK User | |
| description | varchar(500) | |
| due_date | datetime | |
| contact | FK Contact | nullable |
| deal | FK Deal | nullable |
| priority | enum | high / normal / low |
| is_done | boolean | default false |
| is_recurring | boolean | default false |
| recurrence_rule | varchar(100) | nullable (ex: "monthly") |
| created_at | datetime | auto |

### TimelineEntry
| Champ | Type | Notes |
|---|---|---|
| id | UUID | PK |
| organization_id | FK Organization | |
| created_by | FK User | |
| contact | FK Contact | nullable |
| deal | FK Deal | nullable |
| entry_type | varchar(50) | contact_created, deal_created, deal_moved, note_added, task_created, chat_action |
| content | text | |
| metadata | JSONField | données additionnelles |
| created_at | datetime | auto |

### ChatMessage
| Champ | Type | Notes |
|---|---|---|
| id | UUID | PK |
| organization_id | FK Organization | |
| user | FK User | |
| role | enum | user / assistant |
| content | text | |
| actions | JSONField | liste des actions IA effectuées |
| created_at | datetime | auto |

---

## Architecture Chat IA (Pydantic AI)

### Flux de communication

1. Frontend envoie `POST /api/chat/message/` avec le texte du user
2. Django charge le contexte user (20 derniers contacts, 10 deals actifs, 10 tâches à venir)
3. Pydantic AI Agent est invoqué avec le message + contexte
4. L'Agent appelle le LLM qui décide quels tools utiliser
5. Les tools exécutent les actions en DB
6. La réponse est streamée en SSE vers le frontend
7. Le frontend affiche le texte + les cartes inline pour chaque action

### Agent Configuration

```python
agent = Agent(
    model=settings.AI_MODEL,       # Configurable via .env
    system_prompt=SYSTEM_PROMPT,
    deps_type=UserContext,
    result_type=ChatResponse,
)
```

### Tools disponibles

| Tool | Description |
|---|---|
| create_contact | Crée un contact (first_name, last_name, company, email, phone) |
| update_contact | Met à jour un contact existant |
| search_contacts | Recherche full-text dans les contacts |
| create_deal | Crée un deal (name, amount, contact_id, stage) |
| move_deal | Déplace un deal vers un autre stage |
| update_deal | Met à jour un deal |
| create_task | Programme un rappel/tâche (description, due_date, contact, deal) |
| complete_task | Marque une tâche comme faite |
| add_note | Ajoute une note à un contact ou deal |
| get_dashboard_summary | Résumé : CA, deals en cours, rappels |
| search_all | Recherche globale (contacts, deals, notes) |

### Gestion du contexte (coûts)

- 20 derniers contacts (résumés)
- 10 deals actifs (résumés)
- 10 tâches à venir
- 20 derniers messages de chat
- Les tools search font des requêtes DB, pas d'envoi de toute la DB au LLM

### Modèle IA configurable

```env
# .env
AI_MODEL=claude-sonnet-4-20250514     # Par défaut
AI_FALLBACK_MODEL=openai:gpt-4o       # Fallback
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-...
```

---

## API Endpoints

### Auth
```
POST   /api/auth/register/              → Inscription (crée User + Org perso)
POST   /api/auth/login/                 → Login → JWT access + refresh
POST   /api/auth/refresh/               → Refresh JWT
GET    /api/auth/me/                    → Profil user courant
```

### Organization
```
GET    /api/organizations/              → Mes organisations
POST   /api/organizations/              → Créer une organisation
POST   /api/organizations/:id/invite/   → Inviter (V2)
GET    /api/organizations/:id/members/  → Membres (V2)
```

### Contacts
```
GET    /api/contacts/                   → Liste (org active, paginée)
POST   /api/contacts/                   → Créer
GET    /api/contacts/:id/               → Détail + timeline
PATCH  /api/contacts/:id/               → Modifier
DELETE /api/contacts/:id/               → Supprimer
GET    /api/contacts/search/?q=         → Recherche full-text
```

### Deals
```
GET    /api/deals/                      → Liste (org active, paginée)
POST   /api/deals/                      → Créer
GET    /api/deals/:id/                  → Détail
PATCH  /api/deals/:id/                  → Modifier
DELETE /api/deals/:id/                  → Supprimer
GET    /api/deals/pipeline/             → Groupés par stage (Kanban)
```

### Pipeline Stages
```
GET    /api/pipeline-stages/            → Stages de l'org
POST   /api/pipeline-stages/            → Créer
PATCH  /api/pipeline-stages/:id/        → Modifier
DELETE /api/pipeline-stages/:id/        → Supprimer
```

### Tasks
```
GET    /api/tasks/                      → Liste (org, triée par due_date)
POST   /api/tasks/                      → Créer
PATCH  /api/tasks/:id/                  → Modifier / marquer fait
DELETE /api/tasks/:id/                  → Supprimer
```

### Notes / Timeline
```
GET    /api/timeline/?contact=X&deal=Y  → Entries filtrées
POST   /api/notes/                      → Ajouter une note
```

### Chat IA
```
POST   /api/chat/message/               → Message → SSE stream response
GET    /api/chat/history/               → Historique des messages
```

### Dashboard
```
GET    /api/dashboard/stats/            → Stats agrégées
```

---

## Docker Compose (Dev)

```yaml
services:
  db:
    image: postgres:16
    volumes:
      - postgres_data:/var/lib/postgresql/data
    environment:
      POSTGRES_DB: crm_qeylo
      POSTGRES_USER: crm_user
      POSTGRES_PASSWORD: crm_pass
    ports:
      - "5432:5432"

  backend:
    build: ./backend
    command: python manage.py runserver 0.0.0.0:8000
    volumes:
      - ./backend:/app              # Hot-reload
    environment:
      DATABASE_URL: postgresql://crm_user:crm_pass@db:5432/crm_qeylo
      AI_MODEL: ${AI_MODEL:-claude-sonnet-4-20250514}
      AI_FALLBACK_MODEL: ${AI_FALLBACK_MODEL:-openai:gpt-4o}
      ANTHROPIC_API_KEY: ${ANTHROPIC_API_KEY}
      OPENAI_API_KEY: ${OPENAI_API_KEY}
      SECRET_KEY: ${DJANGO_SECRET_KEY}
      DEBUG: "true"
    ports:
      - "8000:8000"
    depends_on:
      - db

  frontend:
    build: ./frontend
    command: npm run dev
    volumes:
      - ./frontend:/app             # Hot-reload
      - /app/node_modules           # Exclude node_modules
    environment:
      NEXT_PUBLIC_API_URL: http://localhost:8000/api
    ports:
      - "3000:3000"
    depends_on:
      - backend

volumes:
  postgres_data:
```

---

## Scope MVP (V1)

### IN
1. Docker Compose (db + backend + frontend) avec hot-reload
2. Auth email/password + JWT (register, login, refresh, me)
3. Organisation auto-créée à l'inscription
4. Chat IA : créer contacts, deals, tâches, rechercher, résumer
5. Contacts : CRUD + timeline + recherche
6. Deals : CRUD + Pipeline Kanban drag & drop
7. Tâches/Rappels : CRUD + liste + marquage fait
8. Dashboard : CA du mois, deals par stage, rappels du jour
9. Paramètres : profil + personnalisation des stages pipeline

### OUT (V2+)
- Invitation de membres (structure DB prête)
- Devis & Factures PDF
- Intégration email (envoi SMTP)
- Rappels intelligents (suggestions IA proactives)
- Login Google / Social
- Notifications push/email
- Import CSV
- App mobile / PWA
- Input vocal
- Intégration calendrier

---

## Personas Cibles (rappel)

- Freelance dev/design (1-5 clients actifs)
- Consultant indépendant (5-15 clients)
- Micro-agence 2-3 personnes
- Artisan/commerçant
