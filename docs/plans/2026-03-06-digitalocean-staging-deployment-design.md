# Design : Deploiement Staging sur DigitalOcean

**Date** : 2026-03-06
**Statut** : Approuve

## Contexte

Deployer le CRM Qeylo en environnement staging sur DigitalOcean App Platform avec un domaine custom `proto.qeylo.com`.

## Architecture

```
                    Cloudflare DNS
                   proto.qeylo.com
                         |
                         v
              DigitalOcean App Platform
              +-------------------------+
              |  frontend (Web Service) | <- Next.js SSR (next start)
              |  backend  (Web Service) | <- Django + Gunicorn/Uvicorn
              |  celery-worker (Worker) | <- Celery worker
              |  celery-beat  (Worker)  | <- Celery beat scheduler
              +------------+------------+
                           |
              +------------+------------+
              v                         v
     Managed PostgreSQL          Managed Redis
     (db-staging, 1GB)          (redis-staging, 1GB)
```

## Composants

### App Platform (4 composants)

| Composant | Type | Image | Port | Commande |
|-----------|------|-------|------|----------|
| frontend | Web Service | `frontend/Dockerfile` | 3000 | `next start` |
| backend | Web Service | `backend/Dockerfile` | 8000 | `gunicorn config.asgi:application -k uvicorn.workers.UvicornWorker` |
| celery-worker | Worker | `backend/Dockerfile` | - | `celery -A config worker -l info` |
| celery-beat | Worker | `backend/Dockerfile` | - | `celery -A config beat -l info --scheduler django_celery_beat.schedulers:DatabaseScheduler` |

### Services manages

| Service | Version | Plan | Cout |
|---------|---------|------|------|
| PostgreSQL | 16 | Basic 1GB | ~15$/mois |
| Redis | 7 | Basic 1GB | ~15$/mois |

### Cout total estime : ~45-60$/mois

## Fichiers a creer/modifier

### Nouveaux fichiers
- `backend/Dockerfile` — Dockerfile de production (distinct du `.dev`)
- `frontend/Dockerfile` — Dockerfile de production multi-stage
- `.do/app.yaml` — App Spec DigitalOcean
- `docs/deployment-digitalocean.md` — Guide de deploiement pas-a-pas

### Fichiers a modifier
- `backend/config/settings.py` — Ajout whitenoise, STATIC_ROOT, ALLOWED_HOSTS et CORS configurables via env
- `backend/requirements.txt` — Ajout whitenoise

## Variables d'environnement

| Variable | Source | Valeur staging |
|----------|--------|---------------|
| SECRET_KEY | Manuelle | Generee aleatoirement |
| DEBUG | Manuelle | false |
| ALLOWED_HOSTS | Manuelle | proto.qeylo.com |
| DATABASE_URL | Auto (DO Managed DB) | Injectee |
| CELERY_BROKER_URL | Auto (DO Managed Redis) | Injectee |
| CELERY_RESULT_BACKEND | Auto (DO Managed Redis) | Injectee |
| CORS_ALLOWED_ORIGINS | Manuelle | https://proto.qeylo.com |
| FRONTEND_URL | Manuelle | https://proto.qeylo.com |
| BACKEND_URL | Manuelle | https://proto.qeylo.com |
| NEXT_PUBLIC_API_URL | Manuelle (build-time) | https://proto.qeylo.com/api |
| ANTHROPIC_API_KEY | Manuelle | Cle API |
| RESEND_API_KEY | Manuelle | Cle API |
| R2_* | Manuelle | Cles Cloudflare R2 |
| GOOGLE_CLIENT_* | Manuelle | Cles OAuth |
| MICROSOFT_CLIENT_* | Manuelle | Cles OAuth |
| EMAIL_ENCRYPTION_KEY | Manuelle | Generee via Fernet |

## DNS & SSL

- **Cloudflare** : CNAME `proto` -> `<app>.ondigitalocean.app` (proxy desactive, DNS only)
- **SSL** : Gere automatiquement par App Platform via Let's Encrypt

## Deploiement

- **Mode** : Manuel (doctl CLI ou dashboard DigitalOcean)
- **Pas de CI/CD automatique** — deploiement declenche explicitement
- **Migrations** : Executees manuellement via `doctl apps console` apres chaque deploiement

## Routing App Platform

- `/api/*` et `/admin/*` -> backend
- Tout le reste -> frontend
