# DigitalOcean Staging Deployment — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make CRM Qeylo deployable on DigitalOcean App Platform with managed PostgreSQL + Redis, accessible at `proto.qeylo.com`.

**Architecture:** App Platform with 4 components (frontend web service, backend web service, celery-worker, celery-beat) connected to managed PostgreSQL 16 and managed Redis 7. Manual deployments via `doctl` CLI.

**Tech Stack:** Django 5.1, Next.js 16, Celery, PostgreSQL 16, Redis 7, Gunicorn+Uvicorn, WhiteNoise, Docker multi-stage builds.

---

### Task 1: Add WhiteNoise to backend requirements

**Files:**
- Modify: `backend/requirements.txt:19` (append after last line)

**Step 1: Add whitenoise dependency**

Add this line at the end of `backend/requirements.txt`:

```
whitenoise>=6.7.0
```

**Step 2: Commit**

```bash
git add backend/requirements.txt
git commit -m "deps: add whitenoise for production static file serving"
```

---

### Task 2: Update Django settings for production readiness

**Files:**
- Modify: `backend/config/settings.py`

**Step 1: Update ALLOWED_HOSTS to be configurable via env var**

Change line 14 from:

```python
ALLOWED_HOSTS = ["*"]
```

to:

```python
_hosts = os.environ.get("ALLOWED_HOSTS", "")
ALLOWED_HOSTS = [h.strip() for h in _hosts.split(",") if h.strip()] if _hosts else ["*"]
```

**Step 2: Add WhiteNoise middleware**

Insert `"whitenoise.middleware.WhiteNoiseMiddleware",` right after `"django.middleware.security.SecurityMiddleware",` in the MIDDLEWARE list (after line 54). The middleware block becomes:

```python
MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "whitenoise.middleware.WhiteNoiseMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "corsheaders.middleware.CorsMiddleware",
    ...
]
```

**Step 3: Add STATIC_ROOT and STATICFILES_STORAGE**

Replace the static files section (lines 130-133) with:

```python
# ---------------------------------------------------------------------------
# Static files
# ---------------------------------------------------------------------------
STATIC_URL = "static/"
STATIC_ROOT = BASE_DIR / "staticfiles"
if not DEBUG:
    STORAGES = {
        "staticfiles": {
            "BACKEND": "whitenoise.storage.CompressedManifestStaticFilesStorage",
        },
    }
```

**Step 4: Make CORS_ALLOWED_ORIGINS configurable via env var**

Replace lines 140-143 with:

```python
CORS_ALLOW_ALL_ORIGINS = DEBUG
_cors_origins = os.environ.get("CORS_ALLOWED_ORIGINS", "")
CORS_ALLOWED_ORIGINS = [o.strip() for o in _cors_origins.split(",") if o.strip()] if _cors_origins else [
    "http://localhost:3000",
]
```

**Step 5: Add CSRF_TRUSTED_ORIGINS for production**

Add after the CORS section:

```python
CSRF_TRUSTED_ORIGINS = [
    f"https://{h}" for h in ALLOWED_HOSTS if h != "*"
]
```

**Step 6: Verify local dev still works**

```bash
cd backend && python -c "import django; import os; os.environ['DJANGO_SETTINGS_MODULE']='config.settings'; django.setup(); print('OK')"
```

Expected: `OK`

**Step 7: Commit**

```bash
git add backend/config/settings.py
git commit -m "feat: make Django settings production-ready (whitenoise, configurable ALLOWED_HOSTS/CORS)"
```

---

### Task 3: Create backend production Dockerfile

**Files:**
- Create: `backend/Dockerfile`

**Step 1: Write the production Dockerfile**

```dockerfile
FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    libpango-1.0-0 libpangocairo-1.0-0 libgdk-pixbuf-2.0-0 \
    libffi-dev libcairo2 libglib2.0-0 && \
    rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

RUN python manage.py collectstatic --noinput 2>/dev/null || true

RUN useradd -r -s /bin/false appuser
USER appuser

EXPOSE 8000

CMD ["gunicorn", "config.asgi:application", "-k", "uvicorn.workers.UvicornWorker", "--bind", "0.0.0.0:8000", "--workers", "2", "--timeout", "120"]
```

**Step 2: Verify it builds locally**

```bash
docker build -t crm-backend-prod -f backend/Dockerfile backend/
```

Expected: Build succeeds.

**Step 3: Commit**

```bash
git add backend/Dockerfile
git commit -m "feat: add backend production Dockerfile (gunicorn + uvicorn workers)"
```

---

### Task 4: Create frontend production Dockerfile

**Files:**
- Create: `frontend/Dockerfile`
- Modify: `frontend/next.config.ts`

**Step 1: Update next.config.ts for standalone output**

Replace contents of `frontend/next.config.ts` with:

```typescript
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
};

export default nextConfig;
```

**Step 2: Write the production Dockerfile**

```dockerfile
FROM node:20-slim AS builder

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci

COPY . .

ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL

RUN npm run build

FROM node:20-slim AS runner

WORKDIR /app

ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
```

**Step 3: Verify it builds locally**

```bash
docker build -t crm-frontend-prod --build-arg NEXT_PUBLIC_API_URL=http://localhost:8000/api -f frontend/Dockerfile frontend/
```

Expected: Build succeeds.

**Step 4: Commit**

```bash
git add frontend/Dockerfile frontend/next.config.ts
git commit -m "feat: add frontend production Dockerfile (multi-stage, standalone)"
```

---

### Task 5: Create DigitalOcean App Spec

**Files:**
- Create: `.do/app.yaml`

**Step 1: Create the .do directory and app spec**

```yaml
name: crm-qeylo-staging
region: fra

domains:
  - domain: proto.qeylo.com
    type: PRIMARY

services:
  - name: backend
    dockerfile_path: backend/Dockerfile
    source_dir: /
    http_port: 8000
    instance_count: 1
    instance_size_slug: basic-xxs
    routes:
      - path: /api
      - path: /admin
    envs:
      - key: SECRET_KEY
        scope: RUN_AND_BUILD_TIME
        type: SECRET
      - key: DEBUG
        scope: RUN_AND_BUILD_TIME
        value: "false"
      - key: ALLOWED_HOSTS
        scope: RUN_AND_BUILD_TIME
        value: "proto.qeylo.com"
      - key: DATABASE_URL
        scope: RUN_AND_BUILD_TIME
        value: ${db-staging.DATABASE_URL}
      - key: CELERY_BROKER_URL
        scope: RUN_AND_BUILD_TIME
        value: ${redis-staging.DATABASE_URL}
      - key: CELERY_RESULT_BACKEND
        scope: RUN_AND_BUILD_TIME
        value: ${redis-staging.DATABASE_URL}
      - key: CORS_ALLOWED_ORIGINS
        scope: RUN_AND_BUILD_TIME
        value: "https://proto.qeylo.com"
      - key: FRONTEND_URL
        scope: RUN_AND_BUILD_TIME
        value: "https://proto.qeylo.com"
      - key: BACKEND_URL
        scope: RUN_AND_BUILD_TIME
        value: "https://proto.qeylo.com"
      - key: ANTHROPIC_API_KEY
        scope: RUN_AND_BUILD_TIME
        type: SECRET
      - key: OPENAI_API_KEY
        scope: RUN_AND_BUILD_TIME
        type: SECRET
      - key: RESEND_API_KEY
        scope: RUN_AND_BUILD_TIME
        type: SECRET
      - key: EMAIL_FROM
        scope: RUN_AND_BUILD_TIME
        value: "Qeylo <noreply@qeylo.com>"
      - key: GOOGLE_CLIENT_ID
        scope: RUN_AND_BUILD_TIME
        type: SECRET
      - key: GOOGLE_CLIENT_SECRET
        scope: RUN_AND_BUILD_TIME
        type: SECRET
      - key: MICROSOFT_CLIENT_ID
        scope: RUN_AND_BUILD_TIME
        type: SECRET
      - key: MICROSOFT_CLIENT_SECRET
        scope: RUN_AND_BUILD_TIME
        type: SECRET
      - key: EMAIL_ENCRYPTION_KEY
        scope: RUN_AND_BUILD_TIME
        type: SECRET
      - key: R2_ACCOUNT_ID
        scope: RUN_AND_BUILD_TIME
        type: SECRET
      - key: R2_ACCESS_KEY_ID
        scope: RUN_AND_BUILD_TIME
        type: SECRET
      - key: R2_SECRET_ACCESS_KEY
        scope: RUN_AND_BUILD_TIME
        type: SECRET
      - key: R2_BUCKET_NAME
        scope: RUN_AND_BUILD_TIME
        value: ""
      - key: R2_PUBLIC_URL
        scope: RUN_AND_BUILD_TIME
        value: ""

  - name: frontend
    dockerfile_path: frontend/Dockerfile
    source_dir: /
    http_port: 3000
    instance_count: 1
    instance_size_slug: basic-xxs
    routes:
      - path: /
    envs:
      - key: NEXT_PUBLIC_API_URL
        scope: BUILD_TIME
        value: "https://proto.qeylo.com/api"

workers:
  - name: celery-worker
    dockerfile_path: backend/Dockerfile
    source_dir: /
    instance_count: 1
    instance_size_slug: basic-xxs
    run_command: celery -A config worker -l info --concurrency=2
    envs:
      - key: SECRET_KEY
        scope: RUN_AND_BUILD_TIME
        type: SECRET
      - key: DEBUG
        scope: RUN_AND_BUILD_TIME
        value: "false"
      - key: DATABASE_URL
        scope: RUN_AND_BUILD_TIME
        value: ${db-staging.DATABASE_URL}
      - key: CELERY_BROKER_URL
        scope: RUN_AND_BUILD_TIME
        value: ${redis-staging.DATABASE_URL}
      - key: CELERY_RESULT_BACKEND
        scope: RUN_AND_BUILD_TIME
        value: ${redis-staging.DATABASE_URL}
      - key: ANTHROPIC_API_KEY
        scope: RUN_AND_BUILD_TIME
        type: SECRET
      - key: OPENAI_API_KEY
        scope: RUN_AND_BUILD_TIME
        type: SECRET
      - key: RESEND_API_KEY
        scope: RUN_AND_BUILD_TIME
        type: SECRET
      - key: GOOGLE_CLIENT_ID
        scope: RUN_AND_BUILD_TIME
        type: SECRET
      - key: GOOGLE_CLIENT_SECRET
        scope: RUN_AND_BUILD_TIME
        type: SECRET
      - key: MICROSOFT_CLIENT_ID
        scope: RUN_AND_BUILD_TIME
        type: SECRET
      - key: MICROSOFT_CLIENT_SECRET
        scope: RUN_AND_BUILD_TIME
        type: SECRET
      - key: EMAIL_ENCRYPTION_KEY
        scope: RUN_AND_BUILD_TIME
        type: SECRET
      - key: R2_ACCOUNT_ID
        scope: RUN_AND_BUILD_TIME
        type: SECRET
      - key: R2_ACCESS_KEY_ID
        scope: RUN_AND_BUILD_TIME
        type: SECRET
      - key: R2_SECRET_ACCESS_KEY
        scope: RUN_AND_BUILD_TIME
        type: SECRET
      - key: R2_BUCKET_NAME
        scope: RUN_AND_BUILD_TIME
        value: ""
      - key: R2_PUBLIC_URL
        scope: RUN_AND_BUILD_TIME
        value: ""
      - key: FRONTEND_URL
        scope: RUN_AND_BUILD_TIME
        value: "https://proto.qeylo.com"
      - key: BACKEND_URL
        scope: RUN_AND_BUILD_TIME
        value: "https://proto.qeylo.com"

  - name: celery-beat
    dockerfile_path: backend/Dockerfile
    source_dir: /
    instance_count: 1
    instance_size_slug: basic-xxs
    run_command: celery -A config beat -l info --scheduler django_celery_beat.schedulers:DatabaseScheduler
    envs:
      - key: SECRET_KEY
        scope: RUN_AND_BUILD_TIME
        type: SECRET
      - key: DEBUG
        scope: RUN_AND_BUILD_TIME
        value: "false"
      - key: DATABASE_URL
        scope: RUN_AND_BUILD_TIME
        value: ${db-staging.DATABASE_URL}
      - key: CELERY_BROKER_URL
        scope: RUN_AND_BUILD_TIME
        value: ${redis-staging.DATABASE_URL}
      - key: CELERY_RESULT_BACKEND
        scope: RUN_AND_BUILD_TIME
        value: ${redis-staging.DATABASE_URL}

databases:
  - name: db-staging
    engine: PG
    version: "16"
    size: db-s-1vcpu-1gb
    num_nodes: 1
```

**Step 2: Commit**

```bash
mkdir -p .do
git add .do/app.yaml
git commit -m "feat: add DigitalOcean App Spec for staging deployment"
```

---

### Task 6: Write deployment guide documentation

**Files:**
- Create: `docs/deployment-digitalocean.md`

**Step 1: Write the complete deployment guide**

Create `docs/deployment-digitalocean.md` with the following content. This is the step-by-step guide the user will follow to deploy from scratch.

````markdown
# Deployer CRM Qeylo sur DigitalOcean — Guide complet

Ce guide explique comment deployer CRM Qeylo en staging sur DigitalOcean App Platform, accessible a `proto.qeylo.com`.

## Pre-requis

- Un compte DigitalOcean avec un moyen de paiement
- `doctl` installe sur ta machine ([instructions](https://docs.digitalocean.com/reference/doctl/how-to/install/))
- Le repo GitHub `hugofrely/crm-qeylo` pousse et a jour
- Acces au dashboard Cloudflare pour `qeylo.com`

## Etape 1 : Installer et configurer doctl

```bash
# macOS
brew install doctl

# Authentification
doctl auth init
# Colle ton token API DigitalOcean (cree-le sur https://cloud.digitalocean.com/account/api/tokens)
```

Verifie que ca marche :

```bash
doctl account get
```

## Etape 2 : Creer la base de donnees Managed PostgreSQL

```bash
doctl databases create db-staging \
  --engine pg \
  --version 16 \
  --region fra1 \
  --size db-s-1vcpu-1gb \
  --num-nodes 1
```

Attends ~5 minutes que la BD soit prete. Verifie :

```bash
doctl databases list
```

Note l'**ID** de la base de donnees, tu en auras besoin.

## Etape 3 : Creer le Managed Redis

```bash
doctl databases create redis-staging \
  --engine redis \
  --version 7 \
  --region fra1 \
  --size db-s-1vcpu-1gb \
  --num-nodes 1
```

Verifie :

```bash
doctl databases list
```

Note l'**ID** du Redis.

## Etape 4 : Creer l'application App Platform

```bash
doctl apps create --spec .do/app.yaml
```

Note l'**App ID** retourne.

> **Important** : L'app spec reference `${db-staging.DATABASE_URL}` et `${redis-staging.DATABASE_URL}`.
> Tu devras lier les bases de donnees a l'app via le dashboard DigitalOcean :
> 1. Va sur https://cloud.digitalocean.com/apps
> 2. Clique sur ton app `crm-qeylo-staging`
> 3. Settings > Components > backend > Environment Variables
> 4. Pour `DATABASE_URL`, clique "Edit" et lie-la a ta Managed Database `db-staging`
> 5. Fais la meme chose pour `CELERY_BROKER_URL` et `CELERY_RESULT_BACKEND` avec `redis-staging`
> 6. Repete pour les workers `celery-worker` et `celery-beat`

## Etape 5 : Configurer les secrets

Dans le dashboard DigitalOcean (Settings > App-Level Environment Variables), ajoute les secrets :

| Variable | Comment la generer |
|----------|-------------------|
| `SECRET_KEY` | `python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"` |
| `ANTHROPIC_API_KEY` | Depuis https://console.anthropic.com/ |
| `OPENAI_API_KEY` | Depuis https://platform.openai.com/ |
| `RESEND_API_KEY` | Depuis https://resend.com/ |
| `GOOGLE_CLIENT_ID` | Depuis https://console.cloud.google.com/apis/credentials |
| `GOOGLE_CLIENT_SECRET` | Idem |
| `MICROSOFT_CLIENT_ID` | Depuis https://portal.azure.com/ |
| `MICROSOFT_CLIENT_SECRET` | Idem |
| `EMAIL_ENCRYPTION_KEY` | `python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"` |
| `R2_ACCOUNT_ID` | Depuis le dashboard Cloudflare R2 |
| `R2_ACCESS_KEY_ID` | Idem |
| `R2_SECRET_ACCESS_KEY` | Idem |
| `R2_BUCKET_NAME` | Le nom de ton bucket R2 |
| `R2_PUBLIC_URL` | L'URL publique de ton bucket |

## Etape 6 : Configurer le DNS (Cloudflare)

1. Va sur https://dash.cloudflare.com/ > `qeylo.com` > DNS
2. Ajoute un enregistrement :
   - **Type** : `CNAME`
   - **Nom** : `proto`
   - **Cible** : l'URL de ton app (visible dans le dashboard DO, quelque chose comme `crm-qeylo-staging-xxxxx.ondigitalocean.app`)
   - **Proxy** : **DESACTIVE** (nuage gris, DNS only)
3. Sauvegarde

Ensuite, dans le dashboard DigitalOcean :
1. Va dans ton app > Settings > Domains
2. Clique "Add Domain"
3. Tape `proto.qeylo.com`
4. DigitalOcean va generer un certificat SSL automatiquement (Let's Encrypt)

Attends ~5 minutes pour la propagation DNS et le certificat.

## Etape 7 : Deployer

```bash
# Recupere l'App ID
doctl apps list

# Lance le deploiement
doctl apps create-deployment <APP_ID>
```

Suis le deploiement :

```bash
doctl apps list-deployments <APP_ID>
```

Ou dans le dashboard : https://cloud.digitalocean.com/apps > ton app > Activity.

## Etape 8 : Executer les migrations Django

Apres le premier deploiement reussi :

```bash
# Ouvre une console dans le composant backend
doctl apps console <APP_ID> backend
```

Dans la console :

```bash
python manage.py migrate
python manage.py createsuperuser
```

## Deploiements suivants

A chaque fois que tu veux deployer une nouvelle version :

```bash
# 1. Push ton code sur GitHub
git push origin main

# 2. Declenche le deploiement
doctl apps create-deployment <APP_ID>

# 3. Si tu as des migrations
doctl apps console <APP_ID> backend
python manage.py migrate
```

## Commandes utiles

```bash
# Voir les logs
doctl apps logs <APP_ID> --component backend --follow
doctl apps logs <APP_ID> --component celery-worker --follow

# Lister les deploiements
doctl apps list-deployments <APP_ID>

# Ouvrir la console
doctl apps console <APP_ID> backend

# Voir l'app spec actuelle
doctl apps spec get <APP_ID>

# Mettre a jour l'app spec
doctl apps update <APP_ID> --spec .do/app.yaml
```

## Depannage

### Le build frontend echoue
- Verifie que `NEXT_PUBLIC_API_URL` est bien defini en `BUILD_TIME`
- Verifie les logs : `doctl apps logs <APP_ID> --component frontend --type build`

### Le backend retourne 500
- Verifie les logs : `doctl apps logs <APP_ID> --component backend --follow`
- Verifie que `DATABASE_URL` est bien liee a la managed DB
- Verifie que les migrations ont ete executees

### Celery ne traite pas les taches
- Verifie que `CELERY_BROKER_URL` pointe bien vers Redis
- Verifie les logs du worker : `doctl apps logs <APP_ID> --component celery-worker --follow`

### Erreur SSL / domaine
- Verifie que le proxy Cloudflare est **desactive** (nuage gris)
- Attends 5-10 minutes pour la propagation
- Dans DO dashboard, verifie que le domaine affiche "Active"

## Architecture de reference

```
proto.qeylo.com (Cloudflare CNAME, proxy OFF)
        |
        v
DigitalOcean App Platform (region: fra / Amsterdam)
├── frontend (Web Service, port 3000)
│   Route: /
├── backend (Web Service, port 8000)
│   Routes: /api, /admin
├── celery-worker (Worker)
└── celery-beat (Worker)
        |
        v
├── Managed PostgreSQL 16 (db-staging)
└── Managed Redis 7 (redis-staging)
```

## Couts

| Composant | Cout mensuel estime |
|-----------|-------------------|
| App Platform (4 composants basic-xxs) | ~20$/mois |
| Managed PostgreSQL (1 vCPU, 1GB) | ~15$/mois |
| Managed Redis (1 vCPU, 1GB) | ~15$/mois |
| **Total** | **~50$/mois** |
````

**Step 2: Commit**

```bash
git add docs/deployment-digitalocean.md
git commit -m "docs: add complete DigitalOcean deployment guide (French)"
```

---

### Task 7: Update .env.example with staging notes

**Files:**
- Modify: `.env.example`

**Step 1: Add staging section at the bottom of .env.example**

Append to `.env.example`:

```
# ========================
# Staging (DigitalOcean)
# ========================
# These are set in App Platform, not here. Listed for reference.
# ALLOWED_HOSTS=proto.qeylo.com
# CORS_ALLOWED_ORIGINS=https://proto.qeylo.com
```

**Step 2: Commit**

```bash
git add .env.example
git commit -m "docs: add staging env var reference to .env.example"
```

---

### Task 8: Verify everything builds locally

**Step 1: Build backend Docker image**

```bash
docker build -t crm-backend-prod -f backend/Dockerfile backend/
```

Expected: Build succeeds.

**Step 2: Build frontend Docker image**

```bash
docker build -t crm-frontend-prod --build-arg NEXT_PUBLIC_API_URL=https://proto.qeylo.com/api -f frontend/Dockerfile frontend/
```

Expected: Build succeeds.

**Step 3: Quick smoke test backend**

```bash
docker run --rm -e SECRET_KEY=test -e DATABASE_URL=sqlite:///tmp/db.sqlite3 -e DEBUG=true crm-backend-prod python -c "import django; import os; os.environ['DJANGO_SETTINGS_MODULE']='config.settings'; django.setup(); print('Django OK')"
```

Expected: `Django OK`

**Step 4: Final commit with all changes**

If any small fixes were needed, commit them:

```bash
git add -A
git commit -m "fix: address build issues found during local verification"
```

(Skip if no fixes needed.)
