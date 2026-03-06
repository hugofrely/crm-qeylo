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
