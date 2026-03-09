# K8s Cluster Design — CRM Qeylo

## Overview

Setup a K3s Kubernetes cluster on 3 OVH VPS for hosting CRM Qeylo in production and staging environments, with Traefik as ingress/load balancer and Cloudflare for DNS/CDN.

## Infrastructure

### Nodes

| Role | IP | User | Hostname |
|------|----|------|----------|
| Master (control plane + workload) | 57.128.246.127 | ubuntu | node-1 |
| Worker | 57.128.247.114 | ubuntu | node-2 |
| Worker | 57.128.246.161 | ubuntu | node-3 |

- **Specs:** 4 vCPU / 8 GB RAM each
- **OS:** Ubuntu
- **Distribution K8s:** K3s (lightweight Kubernetes by Rancher)

### Why K3s

- ~500 MB RAM footprint vs ~1.5 GB for kubeadm
- Installs in 30 seconds per node
- Includes Traefik ingress controller
- Production-ready, used widely on bare metal
- Compatible with all standard K8s tools (kubectl, k9s, Lens, Helm)

## Architecture

```
                    Cloudflare (Proxied - orange cloud)
                    DNS round-robin qeylo.com
                    ┌──────────┬──────────┐
                    ▼          ▼          ▼
            ┌──────────┐ ┌──────────┐ ┌──────────┐
            │  Node 1  │ │  Node 2  │ │  Node 3  │
            │  Master  │ │  Worker  │ │  Worker  │
            │ .246.127 │ │ .247.114 │ │ .246.161 │
            ├──────────┤ ├──────────┤ ├──────────┤
            │ Traefik  │ │ Traefik  │ │ Traefik  │
            │ (DaemonSet)│ (DaemonSet)│ (DaemonSet)│
            ├──────────┤ ├──────────┤ ├──────────┤
            │ frontend │ │ frontend │ │ frontend │
            │ backend  │ │ backend  │ │ backend  │
            │ celery-w │ │ celery-w │ │ celery-w │
            └──────────┘ └──────────┘ └──────────┘
                    │
            Single replica (scheduled on any node):
            - Celery Beat

            External services (outside K8s):
            - PostgreSQL
            - Redis
```

## Services & Replicas

| Service | Replicas | Notes |
|---------|----------|-------|
| Frontend (Next.js) | 2 | Standalone build, port 3000 |
| Backend (Django/Gunicorn+Uvicorn) | 2 | ASGI, port 8000 |
| Celery Worker | 2 | Distributed across nodes |
| Celery Beat | 1 | Single scheduler |
| PostgreSQL 16 | External | Hosted outside K8s cluster |
| Redis 7 | External | Hosted outside K8s cluster |
| Traefik | 3 (DaemonSet) | One per node, hostPort 80/443 |

## Resource Allocation

| Service | Requests (CPU/RAM) | Limits (CPU/RAM) |
|---------|-------------------|------------------|
| Frontend (x2) | 128m / 256Mi | 500m / 512Mi |
| Backend (x2) | 256m / 512Mi | 1000m / 1Gi |
| Celery Worker (x2) | 256m / 256Mi | 500m / 512Mi |
| Celery Beat (x1) | 64m / 128Mi | 256m / 256Mi |
| PostgreSQL | External | External |
| Redis | External | External |
| Traefik (x3) | 64m / 64Mi | 256m / 128Mi |

**Estimated per node:** ~2-3 GB RAM used, ~5 GB headroom.

## Networking & Ingress

### Routing Rules

| Route | Target | Strip Prefix |
|-------|--------|-------------|
| `qeylo.com` | frontend:3000 | No |
| `qeylo.com/api/*` | backend:8000 | No (backend expects `/api/...`) |
| `qeylo.com/admin/*` | backend:8000 | No |
| `qeylo.com/ws/*` | backend:8000 | Yes (strip `/ws`, backend expects `/`) |
| `staging.qeylo.com` | frontend:3000 (staging ns) | No |
| `staging.qeylo.com/api/*` | backend:8000 (staging ns) | No |
| `staging.qeylo.com/ws/*` | backend:8000 (staging ns) | Yes |

### TLS

- **Cloudflare:** Proxied mode (orange cloud) — CDN + DDoS protection
- **SSL mode:** Full (Strict) — Cloudflare verifies origin cert
- **Cloudflare Origin Certificate** (wildcard *.qeylo.com, 15 year validity) — stored as K8s TLS secret

## Namespaces

- `production` — qeylo.com
- `staging` — staging.qeylo.com

## Docker Registry

- **ghcr.io** (GitHub Container Registry)
- Images: `ghcr.io/<org>/crm-qeylo-frontend`, `ghcr.io/<org>/crm-qeylo-backend`
- K8s imagePullSecrets for private registry access

## File Structure

```
k8s/
├── namespace.yaml
├── secrets.yaml
├── backend/
│   ├── deployment.yaml
│   └── service.yaml
├── frontend/
│   ├── deployment.yaml
│   └── service.yaml
├── celery/
│   ├── worker-deployment.yaml
│   └── beat-deployment.yaml
├── ingress/
│   ├── traefik-config.yaml
│   ├── cert-manager.yaml
│   └── ingress.yaml
└── scripts/
    ├── setup-master.sh
    ├── setup-worker.sh
    └── deploy.sh
```

## Cloudflare Setup Guide

### 1. DNS Records

Go to **Cloudflare Dashboard → qeylo.com → DNS → Records** and add:

**Production (qeylo.com):**

| Type | Name | Content | Proxy | TTL |
|------|------|---------|-------|-----|
| A | `@` | 57.128.246.127 | Proxied (orange) | Auto |
| A | `@` | 57.128.247.114 | Proxied (orange) | Auto |
| A | `@` | 57.128.246.161 | Proxied (orange) | Auto |

**Staging (staging.qeylo.com):**

| Type | Name | Content | Proxy | TTL |
|------|------|---------|-------|-----|
| A | `staging` | 57.128.246.127 | Proxied (orange) | Auto |
| A | `staging` | 57.128.247.114 | Proxied (orange) | Auto |
| A | `staging` | 57.128.246.161 | Proxied (orange) | Auto |

This creates DNS round-robin across the 3 nodes. Cloudflare will also health-check and failover automatically.

### 2. Origin Certificate

Go to **SSL/TLS → Origin Server → Create Certificate:**
1. Key type: **RSA (2048)**
2. Hostnames: `*.qeylo.com`, `qeylo.com`
3. Validity: **15 years**
4. Click **Create**
5. **Save the Origin Certificate** to a file `origin-cert.pem`
6. **Save the Private Key** to a file `origin-key.pem`

Then create the K8s secret on both namespaces:

```bash
kubectl create secret tls cloudflare-origin-cert \
  --cert=origin-cert.pem \
  --key=origin-key.pem \
  -n production

kubectl create secret tls cloudflare-origin-cert \
  --cert=origin-cert.pem \
  --key=origin-key.pem \
  -n staging
```

### 3. SSL/TLS Settings

Go to **SSL/TLS → Overview:**
- Set encryption mode to **Full (Strict)**

Go to **SSL/TLS → Edge Certificates:**
- Enable **Always Use HTTPS**
- Enable **Automatic HTTPS Rewrites**
- Set **Minimum TLS Version** to TLS 1.2

### 4. Caching & Performance

Go to **Caching → Configuration:**
- Set **Browser Cache TTL** to "Respect Existing Headers"
- Enable **Always Online**

Go to **Speed → Optimization:**
- Enable **Auto Minify** (JS, CSS, HTML)
- Enable **Brotli** compression

### 5. Security

Go to **Security → Settings:**
- Set **Security Level** to "Medium"
- Enable **Browser Integrity Check**
- Enable **Hotlink Protection** if needed

### 6. Page Rules (optional)

Create a page rule for the API to bypass cache:
- URL: `qeylo.com/api/*`
- Setting: **Cache Level → Bypass**

Create a page rule for WebSocket:
- URL: `qeylo.com/ws/*`
- Setting: **Cache Level → Bypass**

### 7. WebSocket Support

Go to **Network:**
- Ensure **WebSockets** is enabled (should be on by default on all plans)

## kubeconfig Export

After cluster setup, the kubeconfig will be available at:
- On master: `/etc/rancher/k3s/k3s.yaml`
- Export for local use: copy and replace `127.0.0.1` with `57.128.246.127`
- Use with: `export KUBECONFIG=~/.kube/qeylo-config`
- Works with kubectl, k9s, Lens, and any K8s tool
