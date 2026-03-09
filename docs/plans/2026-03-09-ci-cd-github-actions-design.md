# CI/CD GitHub Actions — Design Document

**Date**: 2026-03-09
**Status**: Approved

## Objectif

Mettre en place un pipeline de déploiement automatique via GitHub Actions, déclenché par le push de tags Git, qui build les images Docker, exécute les migrations Django, et déploie sur le cluster K3s (production et staging).

## Décisions

| Sujet | Décision |
|-------|----------|
| Staging | K3s namespace `staging` (migration depuis DigitalOcean) |
| Tags | SemVer : `v1.2.3` → production, `v1.2.3-rc.1` → staging |
| Accès K3s | Kubeconfig direct (API 6443 exposée) |
| Tests | Pas dans le pipeline (validés localement avant tag) |
| Migrations | Automatiques via Job K8s post-build |
| Structure | Workflow unique multi-jobs (`deploy.yml`) |
| Firewall | Port 6443 ouvert à tous (auth via kubeconfig) |

## Architecture du pipeline

```
Push tag v* sur GitHub
        │
        ▼
┌─────────────────────┐
│   determine-env     │  Détecte prod vs staging via le pattern du tag
└─────────┬───────────┘
          │
          ▼
┌─────────────────────┐
│   build (matrix)    │  Build backend + frontend en parallèle
│   Push sur ghcr.io  │  Tags: {git-tag} + latest-{env}
└─────────┬───────────┘
          │
          ▼
┌─────────────────────┐
│   migrate           │  Job K8s temporaire : manage.py migrate
└─────────┬───────────┘
          │
          ▼
┌─────────────────────┐
│   deploy            │  kubectl set image + rollout status
│   (rollback auto)   │  Rollback si échec dans 5min
└─────────────────────┘
```

## Section 1 — Déclenchement et routing

**Trigger** : Push de tags uniquement.

```yaml
on:
  push:
    tags:
      - 'v*'
```

**Logique de routing** :
- Tag contient `-rc.`, `-beta.`, ou `-alpha.` → namespace `staging`
- Tag sans suffixe pre-release (ex: `v1.2.3`) → namespace `production`

Un job `determine-env` exporte `NAMESPACE` et `ENVIRONMENT` comme outputs pour les jobs suivants. Le champ `environment` de chaque job pointe vers l'environnement GitHub correspondant, ce qui injecte les bonnes variables/secrets.

## Section 2 — Job Build & Push

**Job `build`** — Construit et pousse les images Docker sur ghcr.io.

**Matrix** : `service: [backend, frontend]` — build en parallèle.

**Étapes** :
1. Checkout du code
2. Login à ghcr.io via `GITHUB_TOKEN` (permissions `packages: write`)
3. Setup Docker Buildx
4. Build & Push avec `docker/build-push-action` :
   - **Context** : `./{service}/`
   - **Tags** :
     - `ghcr.io/hugofrely/crm-qeylo-{service}:{git-tag}`
     - `ghcr.io/hugofrely/crm-qeylo-{service}:latest`
   - **Cache** : GitHub Actions cache (`type=gha`)
   - **Build args** (frontend uniquement) : `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_WS_URL`, `NEXT_PUBLIC_POSTHOG_KEY`, `NEXT_PUBLIC_POSTHOG_HOST` — injectés depuis les variables de l'environnement GitHub correspondant

**Note** : Les build args frontend varient selon l'environnement (URLs API staging ≠ prod).

## Section 3 — Job Migrate

**Job `migrate`** — Exécute les migrations Django avant le déploiement.

**Dépendance** : `needs: [build]`

**Mécanisme** :
1. Configure `kubectl` avec le `KUBECONFIG` secret de l'environnement GitHub
2. Crée un Job K8s temporaire dans le namespace cible :
   - Image : `ghcr.io/hugofrely/crm-qeylo-backend:{git-tag}`
   - Commande : `python manage.py migrate --noinput`
   - Mêmes secrets K8s que le backend deployment (`DATABASE_URL`, etc.)
   - `restartPolicy: Never`, `backoffLimit: 1`
3. Attend la fin du Job : `kubectl wait --for=condition=complete --timeout=120s`
4. Vérifie le succès et nettoie le Job

**Ordre** : Migrate AVANT deploy — les migrations doivent être appliquées avant que le nouveau code ne tourne.

## Section 4 — Job Deploy

**Job `deploy`** — Met à jour les deployments K8s.

**Dépendance** : `needs: [migrate]`

**Étapes** :
1. Configure `kubectl` avec le `KUBECONFIG`
2. Met à jour l'image de chaque deployment :
   ```bash
   kubectl set image deployment/backend backend=ghcr.io/hugofrely/crm-qeylo-backend:{tag} -n {namespace}
   kubectl set image deployment/frontend frontend=ghcr.io/hugofrely/crm-qeylo-frontend:{tag} -n {namespace}
   kubectl set image deployment/celery-worker celery-worker=ghcr.io/hugofrely/crm-qeylo-backend:{tag} -n {namespace}
   kubectl set image deployment/celery-beat celery-beat=ghcr.io/hugofrely/crm-qeylo-backend:{tag} -n {namespace}
   ```
3. Attend le rollout : `kubectl rollout status deployment/{name} -n {namespace} --timeout=300s`
4. **Rollback automatique** : Si un deployment échoue le rollout → `kubectl rollout undo deployment/{name} -n {namespace}`

## Section 5 — Secrets & variables GitHub

### Environnement `production`

| Type | Nom | Valeur |
|------|-----|--------|
| Secret | `KUBECONFIG` | Contenu du fichier kubeconfig K3s |
| Variable | `NEXT_PUBLIC_API_URL` | `https://qeylo.com/api` |
| Variable | `NEXT_PUBLIC_WS_URL` | `wss://qeylo.com/ws` |
| Variable | `NEXT_PUBLIC_POSTHOG_KEY` | Clé PostHog prod |
| Variable | `NEXT_PUBLIC_POSTHOG_HOST` | Host PostHog |

### Environnement `staging`

| Type | Nom | Valeur |
|------|-----|--------|
| Secret | `KUBECONFIG` | Kubeconfig K3s (potentiellement restreint au namespace staging) |
| Variable | `NEXT_PUBLIC_API_URL` | `https://staging.qeylo.com/api` |
| Variable | `NEXT_PUBLIC_WS_URL` | `wss://staging.qeylo.com/ws` |
| Variable | `NEXT_PUBLIC_POSTHOG_KEY` | Clé PostHog staging (ou vide) |
| Variable | `NEXT_PUBLIC_POSTHOG_HOST` | Host PostHog |

### Permissions du workflow

```yaml
permissions:
  contents: read
  packages: write
```

## Prérequis infrastructure

1. **Port 6443** du master K3s ouvert dans le firewall (accès public, auth via kubeconfig)
2. **TLS SAN** déjà configuré pour l'IP externe `57.128.246.127` ✓
3. **Ingress staging** à créer (`k8s/ingress/ingress-staging.yaml`) pour `staging.qeylo.com`
4. **Secrets K8s staging** à déployer dans le namespace `staging`
5. **Environnements GitHub** à créer dans les settings du repo avec les secrets/variables ci-dessus

## Workflow utilisateur

```
# Déployer en staging
git tag v1.3.0-rc.1
git push origin v1.3.0-rc.1

# Après validation, déployer en production
git tag v1.3.0
git push origin v1.3.0
```

## Fichiers à créer/modifier

| Fichier | Action |
|---------|--------|
| `.github/workflows/deploy.yml` | Créer — Workflow principal |
| `k8s/ingress/ingress-staging.yaml` | Créer — Ingress Traefik pour staging |
| `k8s/backend/deployment.yaml` | Vérifier — Noms de containers cohérents |
| `k8s/scripts/deploy.sh` | Conserver — Script de déploiement manuel (fallback) |
