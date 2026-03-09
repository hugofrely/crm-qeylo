# K8s Cluster Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Deploy CRM Qeylo on a 3-node K3s cluster with Traefik load balancer, TLS via cert-manager, and Cloudflare DNS.

**Architecture:** K3s cluster with 1 master + 2 workers on OVH VPS. Traefik DaemonSet handles ingress on all nodes. PostgreSQL and Redis run as single-replica deployments. Frontend/Backend/Celery scale across nodes. Two namespaces: production and staging.

**Tech Stack:** K3s, Traefik, cert-manager, Let's Encrypt, Cloudflare, ghcr.io, PostgreSQL 16, Redis 7, Django 5.1, Next.js 20

**Design doc:** `docs/plans/2026-03-09-k8s-cluster-design.md`

**VPS Credentials:**
| Role | IP | User | Password |
|------|----|------|----------|
| Master | 57.128.246.127 | ubuntu | aTpfkhjydcCm |
| Worker 1 | 57.128.247.114 | ubuntu | BS4XVhdRXrYy |
| Worker 2 | 57.128.246.161 | ubuntu | b3mJ4skKY3Kc |

**GitHub org:** `hugofrely`
**Domain:** `qeylo.com` (Cloudflare)

---

## Task 1: Create K3s setup scripts

**Files:**
- Create: `k8s/scripts/setup-master.sh`
- Create: `k8s/scripts/setup-worker.sh`

**Step 1: Create master setup script**

Create `k8s/scripts/setup-master.sh`:

```bash
#!/bin/bash
set -euo pipefail

echo "=== K3s Master Setup ==="

# Update system
sudo apt-get update && sudo apt-get upgrade -y

# Install K3s (master mode)
# --disable=traefik: we'll install Traefik ourselves for more control
# --tls-san: allow external access to API server
curl -sfL https://get.k3s.io | INSTALL_K3S_EXEC="server \
  --disable=traefik \
  --tls-san=57.128.246.127 \
  --write-kubeconfig-mode=644 \
  --node-name=node-1" sh -

# Wait for K3s to be ready
echo "Waiting for K3s to start..."
sleep 10
sudo kubectl get nodes

# Print the join token for workers
echo ""
echo "=== JOIN TOKEN (use this on workers) ==="
sudo cat /var/lib/rancher/k3s/server/node-token
echo ""
echo "=== Master setup complete ==="
```

**Step 2: Create worker setup script**

Create `k8s/scripts/setup-worker.sh`:

```bash
#!/bin/bash
set -euo pipefail

if [ $# -lt 2 ]; then
  echo "Usage: $0 <node-name> <join-token>"
  echo "Example: $0 node-2 K10..."
  exit 1
fi

NODE_NAME=$1
JOIN_TOKEN=$2
MASTER_IP="57.128.246.127"

echo "=== K3s Worker Setup: $NODE_NAME ==="

# Update system
sudo apt-get update && sudo apt-get upgrade -y

# Install K3s (agent mode)
curl -sfL https://get.k3s.io | INSTALL_K3S_EXEC="agent \
  --server=https://${MASTER_IP}:6443 \
  --token=${JOIN_TOKEN} \
  --node-name=${NODE_NAME}" sh -

echo "Waiting for K3s agent to start..."
sleep 10

echo "=== Worker $NODE_NAME setup complete ==="
echo "Run 'kubectl get nodes' on master to verify."
```

**Step 3: Make scripts executable and commit**

```bash
chmod +x k8s/scripts/setup-master.sh k8s/scripts/setup-worker.sh
git add k8s/scripts/setup-master.sh k8s/scripts/setup-worker.sh
git commit -m "feat(k8s): add K3s master and worker setup scripts"
```

---

## Task 2: SSH into VPS and install K3s on all nodes

**Step 1: Setup master node**

```bash
ssh ubuntu@57.128.246.127
# upload and run setup-master.sh
# save the join token output
```

Expected: K3s running, `kubectl get nodes` shows node-1 as Ready.

**Step 2: Setup worker node-2**

```bash
ssh ubuntu@57.128.247.114
# upload and run: ./setup-worker.sh node-2 <JOIN_TOKEN>
```

**Step 3: Setup worker node-3**

```bash
ssh ubuntu@57.128.246.161
# upload and run: ./setup-worker.sh node-3 <JOIN_TOKEN>
```

**Step 4: Verify cluster on master**

```bash
ssh ubuntu@57.128.246.127
kubectl get nodes
```

Expected output:
```
NAME     STATUS   ROLES                  AGE   VERSION
node-1   Ready    control-plane,master   Xm    v1.xx
node-2   Ready    <none>                 Xm    v1.xx
node-3   Ready    <none>                 Xm    v1.xx
```

**Step 5: Copy kubeconfig locally**

```bash
scp ubuntu@57.128.246.127:/etc/rancher/k3s/k3s.yaml ~/.kube/qeylo-config
# Edit the file: replace 127.0.0.1 with 57.128.246.127
sed -i '' 's/127.0.0.1/57.128.246.127/g' ~/.kube/qeylo-config
export KUBECONFIG=~/.kube/qeylo-config
kubectl get nodes
```

Expected: Same 3-node output from local machine.

---

## Task 3: Create namespace manifests

**Files:**
- Create: `k8s/namespace.yaml`

**Step 1: Create namespace manifest**

Create `k8s/namespace.yaml`:

```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: production
---
apiVersion: v1
kind: Namespace
metadata:
  name: staging
```

**Step 2: Commit**

```bash
git add k8s/namespace.yaml
git commit -m "feat(k8s): add namespace manifests for production and staging"
```

---

## Task 4: Create secrets manifests

**Files:**
- Create: `k8s/secrets-production.yaml.example`
- Create: `k8s/secrets-staging.yaml.example`

**Step 1: Create production secrets example**

Create `k8s/secrets-production.yaml.example`:

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: crm-secrets
  namespace: production
type: Opaque
stringData:
  POSTGRES_DB: "crm_qeylo"
  POSTGRES_USER: "crm_user"
  POSTGRES_PASSWORD: "CHANGE_ME_STRONG_PASSWORD"
  DATABASE_URL: "postgresql://crm_user:CHANGE_ME_STRONG_PASSWORD@postgres:5432/crm_qeylo"
  CELERY_BROKER_URL: "redis://redis:6379/0"
  CELERY_RESULT_BACKEND: "redis://redis:6379/0"
  SECRET_KEY: "CHANGE_ME_DJANGO_SECRET_KEY"
  ALLOWED_HOSTS: "qeylo.com"
  CORS_ALLOWED_ORIGINS: "https://qeylo.com"
  NEXT_PUBLIC_API_URL: "https://qeylo.com/api"
  NEXT_PUBLIC_WS_URL: "wss://qeylo.com/ws"
---
apiVersion: v1
kind: Secret
metadata:
  name: ghcr-secret
  namespace: production
type: kubernetes.io/dockerconfigjson
data:
  .dockerconfigjson: BASE64_ENCODED_DOCKER_CONFIG
```

**Step 2: Create staging secrets example (same structure, different values)**

Create `k8s/secrets-staging.yaml.example` — same structure but with:
- `namespace: staging`
- `ALLOWED_HOSTS: "staging.qeylo.com"`
- `CORS_ALLOWED_ORIGINS: "https://staging.qeylo.com"`
- `NEXT_PUBLIC_API_URL: "https://staging.qeylo.com/api"`
- `NEXT_PUBLIC_WS_URL: "wss://staging.qeylo.com/ws"`

**Step 3: Add secrets to .gitignore and commit**

```bash
echo "k8s/secrets-production.yaml" >> .gitignore
echo "k8s/secrets-staging.yaml" >> .gitignore
git add k8s/secrets-production.yaml.example k8s/secrets-staging.yaml.example .gitignore
git commit -m "feat(k8s): add secret manifests (examples only, real secrets gitignored)"
```

---

## Task 5: Create PostgreSQL manifests

**Files:**
- Create: `k8s/postgres/pv.yaml`
- Create: `k8s/postgres/pvc.yaml`
- Create: `k8s/postgres/deployment.yaml`
- Create: `k8s/postgres/service.yaml`

**Step 1: Create PV and PVC**

`k8s/postgres/pv.yaml`:

```yaml
apiVersion: v1
kind: PersistentVolume
metadata:
  name: postgres-pv-production
spec:
  capacity:
    storage: 10Gi
  accessModes:
    - ReadWriteOnce
  storageClassName: local-path
  hostPath:
    path: /data/postgres/production
  nodeAffinity:
    required:
      nodeSelectorTerms:
        - matchExpressions:
            - key: kubernetes.io/hostname
              operator: In
              values:
                - node-1
```

`k8s/postgres/pvc.yaml`:

```yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: postgres-pvc
spec:
  accessModes:
    - ReadWriteOnce
  storageClassName: local-path
  resources:
    requests:
      storage: 10Gi
```

**Step 2: Create deployment**

`k8s/postgres/deployment.yaml`:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: postgres
  labels:
    app: postgres
spec:
  replicas: 1
  selector:
    matchLabels:
      app: postgres
  template:
    metadata:
      labels:
        app: postgres
    spec:
      nodeSelector:
        kubernetes.io/hostname: node-1
      containers:
        - name: postgres
          image: postgres:16
          ports:
            - containerPort: 5432
          env:
            - name: POSTGRES_DB
              valueFrom:
                secretKeyRef:
                  name: crm-secrets
                  key: POSTGRES_DB
            - name: POSTGRES_USER
              valueFrom:
                secretKeyRef:
                  name: crm-secrets
                  key: POSTGRES_USER
            - name: POSTGRES_PASSWORD
              valueFrom:
                secretKeyRef:
                  name: crm-secrets
                  key: POSTGRES_PASSWORD
            - name: PGDATA
              value: /var/lib/postgresql/data/pgdata
          volumeMounts:
            - mountPath: /var/lib/postgresql/data
              name: postgres-storage
          resources:
            requests:
              cpu: 256m
              memory: 512Mi
            limits:
              cpu: "1"
              memory: 2Gi
          readinessProbe:
            exec:
              command: ["pg_isready", "-U", "crm_user", "-d", "crm_qeylo"]
            initialDelaySeconds: 5
            periodSeconds: 10
          livenessProbe:
            exec:
              command: ["pg_isready", "-U", "crm_user", "-d", "crm_qeylo"]
            initialDelaySeconds: 30
            periodSeconds: 10
      volumes:
        - name: postgres-storage
          persistentVolumeClaim:
            claimName: postgres-pvc
```

**Step 3: Create service**

`k8s/postgres/service.yaml`:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: postgres
spec:
  selector:
    app: postgres
  ports:
    - port: 5432
      targetPort: 5432
  type: ClusterIP
```

**Step 4: Commit**

```bash
git add k8s/postgres/
git commit -m "feat(k8s): add PostgreSQL deployment with PV and service"
```

---

## Task 6: Create Redis manifests

**Files:**
- Create: `k8s/redis/deployment.yaml`
- Create: `k8s/redis/service.yaml`

**Step 1: Create deployment**

`k8s/redis/deployment.yaml`:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: redis
  labels:
    app: redis
spec:
  replicas: 1
  selector:
    matchLabels:
      app: redis
  template:
    metadata:
      labels:
        app: redis
    spec:
      containers:
        - name: redis
          image: redis:7-alpine
          ports:
            - containerPort: 6379
          resources:
            requests:
              cpu: 64m
              memory: 128Mi
            limits:
              cpu: 256m
              memory: 256Mi
          readinessProbe:
            exec:
              command: ["redis-cli", "ping"]
            initialDelaySeconds: 5
            periodSeconds: 10
          livenessProbe:
            exec:
              command: ["redis-cli", "ping"]
            initialDelaySeconds: 15
            periodSeconds: 10
```

**Step 2: Create service**

`k8s/redis/service.yaml`:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: redis
spec:
  selector:
    app: redis
  ports:
    - port: 6379
      targetPort: 6379
  type: ClusterIP
```

**Step 3: Commit**

```bash
git add k8s/redis/
git commit -m "feat(k8s): add Redis deployment and service"
```

---

## Task 7: Create Backend manifests

**Files:**
- Create: `k8s/backend/deployment.yaml`
- Create: `k8s/backend/service.yaml`

**Step 1: Create deployment**

`k8s/backend/deployment.yaml`:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: backend
  labels:
    app: backend
spec:
  replicas: 2
  selector:
    matchLabels:
      app: backend
  template:
    metadata:
      labels:
        app: backend
    spec:
      imagePullSecrets:
        - name: ghcr-secret
      containers:
        - name: backend
          image: ghcr.io/hugofrely/crm-qeylo-backend:latest
          ports:
            - containerPort: 8000
          env:
            - name: DATABASE_URL
              valueFrom:
                secretKeyRef:
                  name: crm-secrets
                  key: DATABASE_URL
            - name: CELERY_BROKER_URL
              valueFrom:
                secretKeyRef:
                  name: crm-secrets
                  key: CELERY_BROKER_URL
            - name: CELERY_RESULT_BACKEND
              valueFrom:
                secretKeyRef:
                  name: crm-secrets
                  key: CELERY_RESULT_BACKEND
            - name: SECRET_KEY
              valueFrom:
                secretKeyRef:
                  name: crm-secrets
                  key: SECRET_KEY
            - name: ALLOWED_HOSTS
              valueFrom:
                secretKeyRef:
                  name: crm-secrets
                  key: ALLOWED_HOSTS
            - name: CORS_ALLOWED_ORIGINS
              valueFrom:
                secretKeyRef:
                  name: crm-secrets
                  key: CORS_ALLOWED_ORIGINS
          resources:
            requests:
              cpu: 256m
              memory: 512Mi
            limits:
              cpu: "1"
              memory: 1Gi
          readinessProbe:
            httpGet:
              path: /api/health/
              port: 8000
            initialDelaySeconds: 10
            periodSeconds: 10
          livenessProbe:
            httpGet:
              path: /api/health/
              port: 8000
            initialDelaySeconds: 30
            periodSeconds: 15
```

**Step 2: Create service**

`k8s/backend/service.yaml`:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: backend
spec:
  selector:
    app: backend
  ports:
    - port: 8000
      targetPort: 8000
  type: ClusterIP
```

**Step 3: Commit**

```bash
git add k8s/backend/
git commit -m "feat(k8s): add backend deployment and service"
```

---

## Task 8: Create Frontend manifests

**Files:**
- Create: `k8s/frontend/deployment.yaml`
- Create: `k8s/frontend/service.yaml`

**Step 1: Create deployment**

`k8s/frontend/deployment.yaml`:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: frontend
  labels:
    app: frontend
spec:
  replicas: 2
  selector:
    matchLabels:
      app: frontend
  template:
    metadata:
      labels:
        app: frontend
    spec:
      imagePullSecrets:
        - name: ghcr-secret
      containers:
        - name: frontend
          image: ghcr.io/hugofrely/crm-qeylo-frontend:latest
          ports:
            - containerPort: 3000
          env:
            - name: NEXT_PUBLIC_API_URL
              valueFrom:
                secretKeyRef:
                  name: crm-secrets
                  key: NEXT_PUBLIC_API_URL
            - name: NEXT_PUBLIC_WS_URL
              valueFrom:
                secretKeyRef:
                  name: crm-secrets
                  key: NEXT_PUBLIC_WS_URL
          resources:
            requests:
              cpu: 128m
              memory: 256Mi
            limits:
              cpu: 500m
              memory: 512Mi
          readinessProbe:
            httpGet:
              path: /
              port: 3000
            initialDelaySeconds: 10
            periodSeconds: 10
          livenessProbe:
            httpGet:
              path: /
              port: 3000
            initialDelaySeconds: 20
            periodSeconds: 15
```

**Step 2: Create service**

`k8s/frontend/service.yaml`:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: frontend
spec:
  selector:
    app: frontend
  ports:
    - port: 3000
      targetPort: 3000
  type: ClusterIP
```

**Step 3: Commit**

```bash
git add k8s/frontend/
git commit -m "feat(k8s): add frontend deployment and service"
```

---

## Task 9: Create Celery manifests

**Files:**
- Create: `k8s/celery/worker-deployment.yaml`
- Create: `k8s/celery/beat-deployment.yaml`

**Step 1: Create worker deployment**

`k8s/celery/worker-deployment.yaml`:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: celery-worker
  labels:
    app: celery-worker
spec:
  replicas: 2
  selector:
    matchLabels:
      app: celery-worker
  template:
    metadata:
      labels:
        app: celery-worker
    spec:
      imagePullSecrets:
        - name: ghcr-secret
      containers:
        - name: celery-worker
          image: ghcr.io/hugofrely/crm-qeylo-backend:latest
          command: ["celery", "-A", "config", "worker", "-l", "info", "--concurrency=2"]
          env:
            - name: DATABASE_URL
              valueFrom:
                secretKeyRef:
                  name: crm-secrets
                  key: DATABASE_URL
            - name: CELERY_BROKER_URL
              valueFrom:
                secretKeyRef:
                  name: crm-secrets
                  key: CELERY_BROKER_URL
            - name: CELERY_RESULT_BACKEND
              valueFrom:
                secretKeyRef:
                  name: crm-secrets
                  key: CELERY_RESULT_BACKEND
            - name: SECRET_KEY
              valueFrom:
                secretKeyRef:
                  name: crm-secrets
                  key: SECRET_KEY
          resources:
            requests:
              cpu: 256m
              memory: 256Mi
            limits:
              cpu: 500m
              memory: 512Mi
```

**Step 2: Create beat deployment**

`k8s/celery/beat-deployment.yaml`:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: celery-beat
  labels:
    app: celery-beat
spec:
  replicas: 1
  selector:
    matchLabels:
      app: celery-beat
  strategy:
    type: Recreate
  template:
    metadata:
      labels:
        app: celery-beat
    spec:
      imagePullSecrets:
        - name: ghcr-secret
      containers:
        - name: celery-beat
          image: ghcr.io/hugofrely/crm-qeylo-backend:latest
          command: ["celery", "-A", "config", "beat", "-l", "info", "--scheduler", "django_celery_beat.schedulers:DatabaseScheduler"]
          env:
            - name: DATABASE_URL
              valueFrom:
                secretKeyRef:
                  name: crm-secrets
                  key: DATABASE_URL
            - name: CELERY_BROKER_URL
              valueFrom:
                secretKeyRef:
                  name: crm-secrets
                  key: CELERY_BROKER_URL
            - name: CELERY_RESULT_BACKEND
              valueFrom:
                secretKeyRef:
                  name: crm-secrets
                  key: CELERY_RESULT_BACKEND
            - name: SECRET_KEY
              valueFrom:
                secretKeyRef:
                  name: crm-secrets
                  key: SECRET_KEY
          resources:
            requests:
              cpu: 64m
              memory: 128Mi
            limits:
              cpu: 256m
              memory: 256Mi
```

**Step 3: Commit**

```bash
git add k8s/celery/
git commit -m "feat(k8s): add Celery worker and beat deployments"
```

---

## Task 10: Install and configure Traefik

**Files:**
- Create: `k8s/ingress/traefik-values.yaml`

**Step 1: Install Traefik via Helm**

We disabled Traefik in K3s to install it ourselves with custom config.

```bash
# On master or locally with KUBECONFIG set
helm repo add traefik https://traefik.github.io/charts
helm repo update
```

**Step 2: Create Traefik Helm values**

`k8s/ingress/traefik-values.yaml`:

```yaml
deployment:
  kind: DaemonSet

ports:
  web:
    port: 8000
    hostPort: 80
    expose:
      default: true
  websecure:
    port: 8443
    hostPort: 443
    expose:
      default: true

service:
  enabled: false

ingressRoute:
  dashboard:
    enabled: false

providers:
  kubernetesCRD:
    enabled: true
  kubernetesIngress:
    enabled: true

logs:
  general:
    level: INFO

resources:
  requests:
    cpu: 64m
    memory: 64Mi
  limits:
    cpu: 256m
    memory: 128Mi
```

**Step 3: Install Traefik**

```bash
helm install traefik traefik/traefik \
  --namespace kube-system \
  -f k8s/ingress/traefik-values.yaml
```

Expected: Traefik pods running on all 3 nodes.

```bash
kubectl get pods -n kube-system -l app.kubernetes.io/name=traefik
```

**Step 4: Commit**

```bash
git add k8s/ingress/traefik-values.yaml
git commit -m "feat(k8s): add Traefik Helm values for DaemonSet ingress"
```

---

## Task 11: Install cert-manager and configure Let's Encrypt

**Files:**
- Create: `k8s/ingress/cert-manager.yaml`

**Step 1: Install cert-manager**

```bash
kubectl apply -f https://github.com/cert-manager/cert-manager/releases/latest/download/cert-manager.yaml
kubectl wait --for=condition=ready pod -l app.kubernetes.io/instance=cert-manager -n cert-manager --timeout=120s
```

**Step 2: Create ClusterIssuer for Let's Encrypt**

`k8s/ingress/cert-manager.yaml`:

```yaml
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: letsencrypt-prod
spec:
  acme:
    server: https://acme-v02.api.letsencrypt.org/directory
    email: hugo@qeylo.com
    privateKeySecretRef:
      name: letsencrypt-prod
    solvers:
      - http01:
          ingress:
            class: traefik
---
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: letsencrypt-staging
spec:
  acme:
    server: https://acme-staging-v02.api.letsencrypt.org/directory
    email: hugo@qeylo.com
    privateKeySecretRef:
      name: letsencrypt-staging
    solvers:
      - http01:
          ingress:
            class: traefik
```

> Note: Use `letsencrypt-staging` issuer first to test, then switch to `letsencrypt-prod`. The email should be updated to the correct address.

**Step 3: Apply and commit**

```bash
kubectl apply -f k8s/ingress/cert-manager.yaml
git add k8s/ingress/cert-manager.yaml
git commit -m "feat(k8s): add cert-manager ClusterIssuers for Let's Encrypt"
```

---

## Task 12: Create Ingress manifests

**Files:**
- Create: `k8s/ingress/ingress-production.yaml`
- Create: `k8s/ingress/ingress-staging.yaml`
- Create: `k8s/ingress/middleware-strip-ws.yaml`

**Step 1: Create WebSocket strip-prefix middleware**

`k8s/ingress/middleware-strip-ws.yaml`:

```yaml
apiVersion: traefik.io/v1alpha1
kind: Middleware
metadata:
  name: strip-ws-prefix
  namespace: production
spec:
  stripPrefix:
    prefixes:
      - /ws
---
apiVersion: traefik.io/v1alpha1
kind: Middleware
metadata:
  name: strip-ws-prefix
  namespace: staging
spec:
  stripPrefix:
    prefixes:
      - /ws
```

**Step 2: Create production IngressRoute**

`k8s/ingress/ingress-production.yaml`:

```yaml
apiVersion: traefik.io/v1alpha1
kind: IngressRoute
metadata:
  name: crm-production-web
  namespace: production
spec:
  entryPoints:
    - web
  routes:
    - match: Host(`qeylo.com`)
      kind: Rule
      middlewares:
        - name: redirect-to-https
          namespace: production
      services:
        - name: frontend
          port: 3000
---
apiVersion: traefik.io/v1alpha1
kind: Middleware
metadata:
  name: redirect-to-https
  namespace: production
spec:
  redirectScheme:
    scheme: https
    permanent: true
---
apiVersion: traefik.io/v1alpha1
kind: IngressRoute
metadata:
  name: crm-production-secure
  namespace: production
spec:
  entryPoints:
    - websecure
  routes:
    # API routes — no prefix strip
    - match: Host(`qeylo.com`) && PathPrefix(`/api`)
      kind: Rule
      services:
        - name: backend
          port: 8000
    # Admin routes
    - match: Host(`qeylo.com`) && PathPrefix(`/admin`)
      kind: Rule
      services:
        - name: backend
          port: 8000
    # WebSocket routes — strip /ws prefix
    - match: Host(`qeylo.com`) && PathPrefix(`/ws`)
      kind: Rule
      middlewares:
        - name: strip-ws-prefix
      services:
        - name: backend
          port: 8000
    # Static files from backend
    - match: Host(`qeylo.com`) && PathPrefix(`/static`)
      kind: Rule
      services:
        - name: backend
          port: 8000
    # Default — frontend
    - match: Host(`qeylo.com`)
      kind: Rule
      services:
        - name: frontend
          port: 3000
  tls:
    certResolver: letsencrypt-prod
    domains:
      - main: qeylo.com
```

**Step 3: Create staging IngressRoute**

`k8s/ingress/ingress-staging.yaml` — same structure but:
- `namespace: staging`
- `Host(\`staging.qeylo.com\`)`
- Services reference staging namespace

```yaml
apiVersion: traefik.io/v1alpha1
kind: IngressRoute
metadata:
  name: crm-staging-web
  namespace: staging
spec:
  entryPoints:
    - web
  routes:
    - match: Host(`staging.qeylo.com`)
      kind: Rule
      middlewares:
        - name: redirect-to-https
          namespace: staging
      services:
        - name: frontend
          port: 3000
---
apiVersion: traefik.io/v1alpha1
kind: Middleware
metadata:
  name: redirect-to-https
  namespace: staging
spec:
  redirectScheme:
    scheme: https
    permanent: true
---
apiVersion: traefik.io/v1alpha1
kind: IngressRoute
metadata:
  name: crm-staging-secure
  namespace: staging
spec:
  entryPoints:
    - websecure
  routes:
    - match: Host(`staging.qeylo.com`) && PathPrefix(`/api`)
      kind: Rule
      services:
        - name: backend
          port: 8000
    - match: Host(`staging.qeylo.com`) && PathPrefix(`/admin`)
      kind: Rule
      services:
        - name: backend
          port: 8000
    - match: Host(`staging.qeylo.com`) && PathPrefix(`/ws`)
      kind: Rule
      middlewares:
        - name: strip-ws-prefix
      services:
        - name: backend
          port: 8000
    - match: Host(`staging.qeylo.com`) && PathPrefix(`/static`)
      kind: Rule
      services:
        - name: backend
          port: 8000
    - match: Host(`staging.qeylo.com`)
      kind: Rule
      services:
        - name: frontend
          port: 3000
  tls:
    certResolver: letsencrypt-prod
    domains:
      - main: staging.qeylo.com
```

**Step 4: Commit**

```bash
git add k8s/ingress/middleware-strip-ws.yaml k8s/ingress/ingress-production.yaml k8s/ingress/ingress-staging.yaml
git commit -m "feat(k8s): add Traefik IngressRoute for production and staging with WS strip"
```

---

## Task 13: Create deploy script

**Files:**
- Create: `k8s/scripts/deploy.sh`

**Step 1: Create deploy script**

`k8s/scripts/deploy.sh`:

```bash
#!/bin/bash
set -euo pipefail

NAMESPACE=${1:-production}

echo "=== Deploying CRM Qeylo to namespace: $NAMESPACE ==="

# Create namespace if not exists
kubectl apply -f k8s/namespace.yaml

# Apply secrets (must exist as k8s/secrets-<namespace>.yaml)
SECRETS_FILE="k8s/secrets-${NAMESPACE}.yaml"
if [ ! -f "$SECRETS_FILE" ]; then
  echo "ERROR: $SECRETS_FILE not found. Copy from .example and fill in values."
  exit 1
fi
kubectl apply -f "$SECRETS_FILE" -n "$NAMESPACE"

# Deploy infrastructure
echo "Deploying PostgreSQL..."
kubectl apply -f k8s/postgres/ -n "$NAMESPACE"
echo "Waiting for PostgreSQL to be ready..."
kubectl wait --for=condition=ready pod -l app=postgres -n "$NAMESPACE" --timeout=120s

echo "Deploying Redis..."
kubectl apply -f k8s/redis/ -n "$NAMESPACE"
kubectl wait --for=condition=ready pod -l app=redis -n "$NAMESPACE" --timeout=60s

# Deploy application
echo "Deploying Backend..."
kubectl apply -f k8s/backend/ -n "$NAMESPACE"

echo "Deploying Frontend..."
kubectl apply -f k8s/frontend/ -n "$NAMESPACE"

echo "Deploying Celery..."
kubectl apply -f k8s/celery/ -n "$NAMESPACE"

# Apply ingress
echo "Deploying Ingress..."
kubectl apply -f k8s/ingress/middleware-strip-ws.yaml
kubectl apply -f "k8s/ingress/ingress-${NAMESPACE}.yaml"

echo ""
echo "=== Deployment complete ==="
echo "Checking pod status..."
kubectl get pods -n "$NAMESPACE"
```

**Step 2: Make executable and commit**

```bash
chmod +x k8s/scripts/deploy.sh
git add k8s/scripts/deploy.sh
git commit -m "feat(k8s): add deploy script for production and staging"
```

---

## Task 14: Build and push Docker images to ghcr.io

**Step 1: Login to ghcr.io**

```bash
echo $GITHUB_TOKEN | docker login ghcr.io -u hugofrely --password-stdin
```

**Step 2: Build and push backend**

```bash
docker build -t ghcr.io/hugofrely/crm-qeylo-backend:latest ./backend
docker push ghcr.io/hugofrely/crm-qeylo-backend:latest
```

**Step 3: Build and push frontend**

```bash
docker build \
  --build-arg NEXT_PUBLIC_API_URL=https://qeylo.com/api \
  --build-arg NEXT_PUBLIC_WS_URL=wss://qeylo.com/ws \
  -t ghcr.io/hugofrely/crm-qeylo-frontend:latest ./frontend
docker push ghcr.io/hugofrely/crm-qeylo-frontend:latest
```

---

## Task 15: Create ghcr.io pull secret on cluster

**Step 1: Create docker registry secret**

```bash
kubectl create secret docker-registry ghcr-secret \
  --docker-server=ghcr.io \
  --docker-username=hugofrely \
  --docker-password=$GITHUB_TOKEN \
  --docker-email=hugo@qeylo.com \
  -n production

kubectl create secret docker-registry ghcr-secret \
  --docker-server=ghcr.io \
  --docker-username=hugofrely \
  --docker-password=$GITHUB_TOKEN \
  --docker-email=hugo@qeylo.com \
  -n staging
```

---

## Task 16: Deploy to staging first

**Step 1: Create real secrets file**

```bash
cp k8s/secrets-staging.yaml.example k8s/secrets-staging.yaml
# Edit k8s/secrets-staging.yaml with real passwords
```

**Step 2: Deploy**

```bash
./k8s/scripts/deploy.sh staging
```

**Step 3: Verify**

```bash
kubectl get pods -n staging
kubectl logs -f deployment/backend -n staging
kubectl logs -f deployment/frontend -n staging
```

Expected: All pods Running, no crash loops.

**Step 4: Test endpoints**

```bash
curl -k https://staging.qeylo.com/api/health/
curl -k https://staging.qeylo.com/
```

---

## Task 17: Run Django migrations on cluster

**Step 1: Run migrations**

```bash
kubectl exec -it deployment/backend -n staging -- python manage.py migrate
```

**Step 2: Create superuser (optional)**

```bash
kubectl exec -it deployment/backend -n staging -- python manage.py createsuperuser
```

---

## Task 18: Deploy to production

**Step 1: Create real secrets file**

```bash
cp k8s/secrets-production.yaml.example k8s/secrets-production.yaml
# Edit k8s/secrets-production.yaml with real passwords
```

**Step 2: Deploy**

```bash
./k8s/scripts/deploy.sh production
```

**Step 3: Run migrations**

```bash
kubectl exec -it deployment/backend -n production -- python manage.py migrate
```

**Step 4: Verify everything**

```bash
kubectl get pods -n production
curl https://qeylo.com/api/health/
curl https://qeylo.com/
```

---

## Task 19: Configure Cloudflare DNS

Follow the Cloudflare Setup Guide in `docs/plans/2026-03-09-k8s-cluster-design.md`:

1. Add 3 A records for `@` pointing to each VPS IP (Proxied)
2. Add 3 A records for `staging` pointing to each VPS IP (Proxied)
3. Set SSL mode to Full (Strict)
4. Enable Always Use HTTPS
5. Add page rules to bypass cache for `/api/*` and `/ws/*`
6. Verify WebSockets enabled under Network

---

## Task 20: Verify end-to-end

**Step 1: Test production**

```bash
# HTTPS redirect
curl -I http://qeylo.com
# Expected: 301 → https://qeylo.com

# Frontend
curl -I https://qeylo.com
# Expected: 200

# API
curl https://qeylo.com/api/health/
# Expected: 200

# WebSocket (use wscat)
npx wscat -c wss://qeylo.com/ws/
# Expected: connection established
```

**Step 2: Test staging**

Same tests with `staging.qeylo.com`.

**Step 3: Commit final state**

```bash
git add -A
git commit -m "feat(k8s): complete K3s cluster setup with Traefik, cert-manager, and Cloudflare"
```
