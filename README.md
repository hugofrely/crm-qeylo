# Qeylo CRM

CRM intelligent pour freelances et petites équipes, avec un agent IA conversationnel intégré.

## Stack technique

| Couche | Technologies |
|--------|-------------|
| **Frontend** | Next.js 16, React 19, TypeScript, Tailwind CSS 4, Radix UI, dnd-kit |
| **Backend** | Django 5, Django REST Framework, Uvicorn (ASGI) |
| **Base de données** | PostgreSQL 16 |
| **IA** | Pydantic AI (Claude / GPT-4) |
| **Infra** | Docker, Docker Compose |

## Fonctionnalités

- **Gestion des contacts** — profils enrichis, scoring (Hot/Warm/Cold), import CSV, enrichissement IA
- **Pipeline de ventes** — Kanban drag & drop, étapes personnalisables, suivi des deals
- **Tâches** — priorités, récurrence, association contacts/deals
- **Timeline d'activités** — historique complet des interactions (appels, emails, réunions, notes…)
- **Agent IA** — chat conversationnel avec streaming, capable de créer/rechercher/modifier contacts, deals et tâches
- **Notifications** — in-app + email (Resend), invitations d'équipe
- **Multi-tenant** — organisations avec rôles (Owner, Admin, Member)
- **Dashboard** — métriques clés et vue d'ensemble du pipeline

## Démarrage rapide

### Prérequis

- Docker & Docker Compose

### Lancement

```bash
# Copier et configurer les variables d'environnement
cp .env.example .env

# Démarrer tous les services
docker-compose up
```

L'application est accessible sur :
- **Frontend** : http://localhost:3000
- **Backend API** : http://localhost:8000/api
- **Admin Django** : http://localhost:8000/admin

### Variables d'environnement

```env
# Django
SECRET_KEY=change-me
DEBUG=true
DATABASE_URL=postgresql://crm_user:crm_pass@db:5432/crm_qeylo

# IA
ANTHROPIC_API_KEY=sk-ant-...
AI_MODEL=claude-sonnet-4-20250514
AI_FALLBACK_MODEL=openai:gpt-4o

# Frontend
NEXT_PUBLIC_API_URL=http://localhost:8000/api

# Notifications email (optionnel)
RESEND_API_KEY=
```

## Développement local (sans Docker)

### Backend

```bash
cd backend
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver 0.0.0.0:8000
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

## Structure du projet

```
├── backend/
│   ├── accounts/          # Auth, modèle User (UUID, email-based)
│   ├── organizations/     # Multi-tenant, invitations, rôles
│   ├── contacts/          # Gestion des contacts, import CSV
│   ├── deals/             # Pipeline de ventes, étapes
│   ├── tasks/             # Gestion des tâches
│   ├── notes/             # Timeline, activités, notes
│   ├── chat/              # Agent IA, streaming, tools
│   ├── dashboard/         # Métriques et analytics
│   ├── notifications/     # Notifications in-app et email
│   └── config/            # Settings Django, URLs, ASGI
├── frontend/
│   ├── app/
│   │   ├── (app)/         # Routes authentifiées (dashboard, contacts, deals…)
│   │   ├── (auth)/        # Login, register
│   │   └── (marketing)/   # Pages publiques
│   ├── components/        # Composants React (chat, deals, tasks…)
│   └── lib/               # Auth context, utilitaires
├── docs/                  # Specs et plans d'implémentation
└── docker-compose.yml
```

## API

| Ressource | Endpoints |
|-----------|-----------|
| Auth | `POST /api/auth/register/` · `POST /api/auth/login/` · `POST /api/auth/refresh/` |
| Contacts | `GET/POST /api/contacts/` · `GET/PUT/DELETE /api/contacts/{id}/` |
| Deals | `GET/POST /api/deals/` · `GET/PUT/DELETE /api/deals/{id}/` |
| Pipeline | `GET/POST /api/pipeline-stages/` |
| Tâches | `GET/POST /api/tasks/` · `GET/PUT/DELETE /api/tasks/{id}/` |
| Chat IA | `POST /api/chat/conversations/` · `POST /api/chat/{id}/messages/` |
| Timeline | `GET /api/timeline/` · `GET /api/activities/` |
| Notifications | `GET /api/notifications/` · `POST /api/notifications/read/` |
| Dashboard | `GET /api/dashboard/` |
| Organisations | `GET/POST /api/organizations/` · `POST /api/organizations/{id}/invite/` |
