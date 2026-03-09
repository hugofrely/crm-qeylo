# Checklist GitHub — Configuration avant premier deploy

**Repo** : github.com/hugofrely/crm-qeylo
**Emplacement** : Settings → Environments

---

## 1. Prérequis serveur

Avant de configurer GitHub, ouvre le port 6443 sur le serveur K3s :

```bash
ssh root@57.128.246.127
sudo ufw allow 6443/tcp
```

Puis récupère le kubeconfig :

```bash
cat /etc/rancher/k3s/k3s.yaml
```

Dans le contenu copié, remplace :
```
server: https://127.0.0.1:6443
```
par :
```
server: https://57.128.246.127:6443
```

Ce contenu modifié = la valeur du secret `KUBECONFIG` ci-dessous.

---

## 2. Créer l'environnement `production`

Settings → Environments → New environment → **production**

### Secrets (Settings → Environments → production → Environment secrets)

| Secret | Valeur | Description |
|--------|--------|-------------|
| `KUBECONFIG` | Contenu de k3s.yaml modifié (voir ci-dessus) | Accès au cluster K3s |
| `DATABASE_URL` | `postgresql://user:pass@host:port/dbname?sslmode=require` | URL PostgreSQL production |
| `SECRET_KEY` | Clé Django production | Générer avec `python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"` |
| `CELERY_BROKER_URL` | `rediss://default:pass@host:port/0` | URL Redis/Valkey production |
| `CELERY_RESULT_BACKEND` | `rediss://default:pass@host:port/0` | Même URL que CELERY_BROKER_URL |
| `ALLOWED_HOSTS` | `qeylo.com` | Domaine production |
| `CORS_ALLOWED_ORIGINS` | `https://qeylo.com` | Origine CORS production |
| `ANTHROPIC_API_KEY` | `sk-ant-...` | Clé API Claude |
| `OPENAI_API_KEY` | `sk-...` | Clé API OpenAI (fallback) |
| `AI_MODEL` | `claude-sonnet-4-20250514` | Modèle AI principal |
| `AI_FALLBACK_MODEL` | `openai:gpt-4o` | Modèle AI de fallback |
| `RESEND_API_KEY` | `re_...` | Clé Resend pour l'envoi d'emails |
| `EMAIL_FROM` | `Qeylo <noreply@qeylo.com>` | Adresse expéditeur |
| `EMAIL_ENCRYPTION_KEY` | Clé Fernet | Générer avec `python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"` |
| `GOOGLE_CLIENT_ID` | ID OAuth Google | console.cloud.google.com |
| `GOOGLE_CLIENT_SECRET` | Secret OAuth Google | console.cloud.google.com |
| `MICROSOFT_CLIENT_ID` | ID OAuth Microsoft | portal.azure.com |
| `MICROSOFT_CLIENT_SECRET` | Secret OAuth Microsoft | portal.azure.com |
| `R2_ACCOUNT_ID` | ID compte Cloudflare | dashboard.cloudflare.com |
| `R2_ACCESS_KEY_ID` | Clé d'accès R2 | dashboard.cloudflare.com → R2 → API tokens |
| `R2_SECRET_ACCESS_KEY` | Secret R2 | dashboard.cloudflare.com → R2 → API tokens |
| `R2_BUCKET_NAME` | Nom du bucket R2 prod | Ex: `qeylo-uploads` |
| `R2_PUBLIC_URL` | URL publique du bucket | Ex: `https://cdn.qeylo.com` |
| `STRIPE_SECRET_KEY` | `sk_live_...` | dashboard.stripe.com → API keys |
| `STRIPE_PUBLISHABLE_KEY` | `pk_live_...` | dashboard.stripe.com → API keys |
| `STRIPE_WEBHOOK_SECRET` | `whsec_...` | dashboard.stripe.com → Webhooks |
| `STRIPE_PRO_PRICE_ID` | `price_...` | ID du prix Pro dans Stripe |
| `STRIPE_TEAM_PRICE_ID` | `price_...` | ID du prix Team dans Stripe |
| `BACKEND_URL` | `https://qeylo.com` | URL interne backend |
| `FRONTEND_URL` | `https://qeylo.com` | URL interne frontend |

### Variables (Settings → Environments → production → Environment variables)

| Variable | Valeur |
|----------|--------|
| `NEXT_PUBLIC_API_URL` | `https://qeylo.com/api` |
| `NEXT_PUBLIC_WS_URL` | `wss://qeylo.com/ws` |
| `NEXT_PUBLIC_POSTHOG_KEY` | Clé PostHog prod |
| `NEXT_PUBLIC_POSTHOG_HOST` | Host PostHog (ex: `https://eu.i.posthog.com`) |

---

## 3. Créer l'environnement `staging`

Settings → Environments → New environment → **staging**

### Secrets

Mêmes clés que production, avec les valeurs staging :

| Secret | Différence vs production |
|--------|--------------------------|
| `KUBECONFIG` | Même kubeconfig (ou un restreint au namespace staging) |
| `DATABASE_URL` | URL PostgreSQL staging |
| `SECRET_KEY` | Clé Django différente de prod |
| `CELERY_BROKER_URL` | URL Redis/Valkey staging |
| `CELERY_RESULT_BACKEND` | Même que CELERY_BROKER_URL staging |
| `ALLOWED_HOSTS` | `staging.qeylo.com` |
| `CORS_ALLOWED_ORIGINS` | `https://staging.qeylo.com` |
| `ANTHROPIC_API_KEY` | Même clé ou clé de test |
| `OPENAI_API_KEY` | Même clé ou clé de test |
| `AI_MODEL` | `claude-sonnet-4-20250514` |
| `AI_FALLBACK_MODEL` | `openai:gpt-4o` |
| `RESEND_API_KEY` | Même ou clé de test |
| `EMAIL_FROM` | `Qeylo <noreply@qeylo.com>` |
| `EMAIL_ENCRYPTION_KEY` | Clé Fernet différente de prod |
| `GOOGLE_CLIENT_ID` | Mêmes ou credentials de test |
| `GOOGLE_CLIENT_SECRET` | Mêmes ou credentials de test |
| `MICROSOFT_CLIENT_ID` | Mêmes ou credentials de test |
| `MICROSOFT_CLIENT_SECRET` | Mêmes ou credentials de test |
| `R2_ACCOUNT_ID` | Même compte |
| `R2_ACCESS_KEY_ID` | Même ou bucket staging séparé |
| `R2_SECRET_ACCESS_KEY` | Même ou bucket staging séparé |
| `R2_BUCKET_NAME` | `qeylo-uploads-staging` (bucket séparé recommandé) |
| `R2_PUBLIC_URL` | URL publique du bucket staging |
| `STRIPE_SECRET_KEY` | `sk_test_...` (clé de TEST Stripe) |
| `STRIPE_PUBLISHABLE_KEY` | `pk_test_...` (clé de TEST Stripe) |
| `STRIPE_WEBHOOK_SECRET` | `whsec_...` (webhook de test) |
| `STRIPE_PRO_PRICE_ID` | `price_...` (prix de test) |
| `STRIPE_TEAM_PRICE_ID` | `price_...` (prix de test) |
| `BACKEND_URL` | `https://staging.qeylo.com` |
| `FRONTEND_URL` | `https://staging.qeylo.com` |

### Variables

| Variable | Valeur |
|----------|--------|
| `NEXT_PUBLIC_API_URL` | `https://staging.qeylo.com/api` |
| `NEXT_PUBLIC_WS_URL` | `wss://staging.qeylo.com/ws` |
| `NEXT_PUBLIC_POSTHOG_KEY` | Clé PostHog staging (ou vide) |
| `NEXT_PUBLIC_POSTHOG_HOST` | Host PostHog (ou vide) |

---

## 4. Vérification

Une fois tout configuré, teste avec un tag staging :

```bash
git tag v0.1.0-rc.1
git push origin v0.1.0-rc.1
```

Puis surveille : github.com/hugofrely/crm-qeylo/actions

Le pipeline doit passer par : **determine-env → build → sync-secrets → migrate → deploy**
