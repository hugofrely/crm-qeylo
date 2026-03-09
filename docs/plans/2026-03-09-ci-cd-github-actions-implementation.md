# CI/CD GitHub Actions Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Automated deployment pipeline triggered by Git tags that builds Docker images, runs Django migrations, and deploys to K3s.

**Architecture:** Single GitHub Actions workflow (`deploy.yml`) with 4 jobs: determine-env → build (matrix) → migrate → deploy. Tags matching `v*` with pre-release suffix deploy to staging namespace, clean semver tags deploy to production. Kubeconfig stored in GitHub environment secrets.

**Tech Stack:** GitHub Actions, Docker Buildx, ghcr.io, kubectl, K3s

---

### Task 1: Create the GitHub Actions workflow file

**Files:**
- Create: `.github/workflows/deploy.yml`

**Step 1: Create the .github/workflows directory**

```bash
mkdir -p .github/workflows
```

**Step 2: Write the workflow file**

Create `.github/workflows/deploy.yml` with the following content:

```yaml
name: Build & Deploy

on:
  push:
    tags:
      - 'v*'

permissions:
  contents: read
  packages: write

jobs:
  # ─── Job 1: Determine environment from tag ───
  determine-env:
    runs-on: ubuntu-latest
    outputs:
      environment: ${{ steps.env.outputs.environment }}
      namespace: ${{ steps.env.outputs.namespace }}
      tag: ${{ steps.env.outputs.tag }}
    steps:
      - name: Determine environment from tag
        id: env
        run: |
          TAG=${GITHUB_REF#refs/tags/}
          echo "tag=$TAG" >> $GITHUB_OUTPUT
          if [[ "$TAG" == *"-rc."* ]] || [[ "$TAG" == *"-beta."* ]] || [[ "$TAG" == *"-alpha."* ]]; then
            echo "environment=staging" >> $GITHUB_OUTPUT
            echo "namespace=staging" >> $GITHUB_OUTPUT
            echo "🚀 Deploying $TAG to STAGING"
          else
            echo "environment=production" >> $GITHUB_OUTPUT
            echo "namespace=production" >> $GITHUB_OUTPUT
            echo "🚀 Deploying $TAG to PRODUCTION"
          fi

  # ─── Job 2: Build & push Docker images ───
  build:
    runs-on: ubuntu-latest
    needs: [determine-env]
    environment: ${{ needs.determine-env.outputs.environment }}
    strategy:
      matrix:
        service: [backend, frontend]
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Log in to GitHub Container Registry
        uses: docker/login-action@v3
        with:
          registry: ghcr.io
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v3

      - name: Build & push image
        uses: docker/build-push-action@v6
        with:
          context: ./${{ matrix.service }}
          push: true
          tags: |
            ghcr.io/hugofrely/crm-qeylo-${{ matrix.service }}:${{ needs.determine-env.outputs.tag }}
            ghcr.io/hugofrely/crm-qeylo-${{ matrix.service }}:latest
          cache-from: type=gha,scope=${{ matrix.service }}
          cache-to: type=gha,mode=max,scope=${{ matrix.service }}
          build-args: |
            ${{ matrix.service == 'frontend' && format('NEXT_PUBLIC_API_URL={0}', vars.NEXT_PUBLIC_API_URL) || '' }}
            ${{ matrix.service == 'frontend' && format('NEXT_PUBLIC_WS_URL={0}', vars.NEXT_PUBLIC_WS_URL) || '' }}
            ${{ matrix.service == 'frontend' && format('NEXT_PUBLIC_POSTHOG_KEY={0}', vars.NEXT_PUBLIC_POSTHOG_KEY) || '' }}
            ${{ matrix.service == 'frontend' && format('NEXT_PUBLIC_POSTHOG_HOST={0}', vars.NEXT_PUBLIC_POSTHOG_HOST) || '' }}

  # ─── Job 3: Run Django migrations ───
  migrate:
    runs-on: ubuntu-latest
    needs: [determine-env, build]
    environment: ${{ needs.determine-env.outputs.environment }}
    env:
      NAMESPACE: ${{ needs.determine-env.outputs.namespace }}
      TAG: ${{ needs.determine-env.outputs.tag }}
    steps:
      - name: Set up kubectl
        uses: azure/setup-kubectl@v4

      - name: Configure kubeconfig
        run: |
          mkdir -p $HOME/.kube
          echo "${{ secrets.KUBECONFIG }}" > $HOME/.kube/config
          chmod 600 $HOME/.kube/config

      - name: Run migrations
        run: |
          cat <<EOF | kubectl apply -f -
          apiVersion: batch/v1
          kind: Job
          metadata:
            name: django-migrate-${TAG//\./-}
            namespace: $NAMESPACE
          spec:
            backoffLimit: 1
            ttlSecondsAfterFinished: 300
            template:
              spec:
                imagePullSecrets:
                  - name: ghcr-secret
                restartPolicy: Never
                containers:
                  - name: migrate
                    image: ghcr.io/hugofrely/crm-qeylo-backend:$TAG
                    command: ["python", "manage.py", "migrate", "--noinput"]
                    env:
                      - name: DATABASE_URL
                        valueFrom:
                          secretKeyRef:
                            name: crm-secrets
                            key: DATABASE_URL
                      - name: SECRET_KEY
                        valueFrom:
                          secretKeyRef:
                            name: crm-secrets
                            key: SECRET_KEY
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
          EOF

      - name: Wait for migration to complete
        run: |
          kubectl wait --for=condition=complete \
            job/django-migrate-${TAG//\./-} \
            -n $NAMESPACE \
            --timeout=120s

      - name: Check migration logs
        if: always()
        run: |
          kubectl logs job/django-migrate-${TAG//\./-} -n $NAMESPACE

      - name: Cleanup migration job
        if: always()
        run: |
          kubectl delete job django-migrate-${TAG//\./-} -n $NAMESPACE --ignore-not-found

  # ─── Job 4: Deploy to K3s ───
  deploy:
    runs-on: ubuntu-latest
    needs: [determine-env, migrate]
    environment: ${{ needs.determine-env.outputs.environment }}
    env:
      NAMESPACE: ${{ needs.determine-env.outputs.namespace }}
      TAG: ${{ needs.determine-env.outputs.tag }}
    steps:
      - name: Set up kubectl
        uses: azure/setup-kubectl@v4

      - name: Configure kubeconfig
        run: |
          mkdir -p $HOME/.kube
          echo "${{ secrets.KUBECONFIG }}" > $HOME/.kube/config
          chmod 600 $HOME/.kube/config

      - name: Update deployment images
        run: |
          kubectl set image deployment/backend \
            backend=ghcr.io/hugofrely/crm-qeylo-backend:$TAG \
            -n $NAMESPACE

          kubectl set image deployment/frontend \
            frontend=ghcr.io/hugofrely/crm-qeylo-frontend:$TAG \
            -n $NAMESPACE

          kubectl set image deployment/celery-worker \
            celery-worker=ghcr.io/hugofrely/crm-qeylo-backend:$TAG \
            -n $NAMESPACE

          kubectl set image deployment/celery-beat \
            celery-beat=ghcr.io/hugofrely/crm-qeylo-backend:$TAG \
            -n $NAMESPACE

      - name: Wait for rollouts
        run: |
          DEPLOYMENTS="backend frontend celery-worker celery-beat"
          FAILED=""

          for DEPLOY in $DEPLOYMENTS; do
            echo "⏳ Waiting for $DEPLOY rollout..."
            if ! kubectl rollout status deployment/$DEPLOY -n $NAMESPACE --timeout=300s; then
              echo "❌ $DEPLOY rollout failed, rolling back..."
              kubectl rollout undo deployment/$DEPLOY -n $NAMESPACE
              FAILED="$FAILED $DEPLOY"
            else
              echo "✅ $DEPLOY rolled out successfully"
            fi
          done

          if [ -n "$FAILED" ]; then
            echo "❌ Failed deployments:$FAILED"
            exit 1
          fi

          echo "🎉 All deployments rolled out successfully"
```

**Step 3: Verify the file syntax**

```bash
cat .github/workflows/deploy.yml | head -5
```

Expected: The YAML header with `name: Build & Deploy`

**Step 4: Commit**

```bash
git add .github/workflows/deploy.yml
git commit -m "feat(ci): add GitHub Actions deploy workflow

Automated pipeline triggered by Git tags:
- v1.2.3 → production, v1.2.3-rc.1 → staging
- Builds backend + frontend images on ghcr.io
- Runs Django migrations via K8s Job
- Deploys with kubectl set image + automatic rollback"
```

---

### Task 2: Open firewall port 6443 on K3s master

**This is a manual task on the server (57.128.246.127).**

**Step 1: SSH into the K3s master**

```bash
ssh root@57.128.246.127
```

**Step 2: Open port 6443**

```bash
# Check if ufw is active
sudo ufw status

# If active, allow 6443
sudo ufw allow 6443/tcp

# If using iptables directly
sudo iptables -A INPUT -p tcp --dport 6443 -j ACCEPT
```

**Step 3: Verify access from local machine**

```bash
curl -k https://57.128.246.127:6443/version
```

Expected: JSON response with K3s version info (or 401 Unauthorized, which still means the port is open).

---

### Task 3: Configure GitHub environments and secrets

**This is a manual task in GitHub repo settings (github.com/hugofrely/crm-qeylo/settings/environments).**

**Step 1: Create `production` environment**

Go to Settings → Environments → New environment → `production`

Add secret:
- `KUBECONFIG`: Content of `/etc/rancher/k3s/k3s.yaml` from the master node, with `server:` changed from `https://127.0.0.1:6443` to `https://57.128.246.127:6443`

Add variables:
- `NEXT_PUBLIC_API_URL`: `https://qeylo.com/api`
- `NEXT_PUBLIC_WS_URL`: `wss://qeylo.com/ws`
- `NEXT_PUBLIC_POSTHOG_KEY`: (your PostHog key)
- `NEXT_PUBLIC_POSTHOG_HOST`: (your PostHog host)

**Step 2: Create `staging` environment**

Go to Settings → Environments → New environment → `staging`

Add secret:
- `KUBECONFIG`: Same kubeconfig (or a scoped one for staging namespace only)

Add variables:
- `NEXT_PUBLIC_API_URL`: `https://staging.qeylo.com/api`
- `NEXT_PUBLIC_WS_URL`: `wss://staging.qeylo.com/ws`
- `NEXT_PUBLIC_POSTHOG_KEY`: (staging key or empty)
- `NEXT_PUBLIC_POSTHOG_HOST`: (staging host or empty)

**Step 3: Verify kubeconfig works**

From local machine, test the kubeconfig:

```bash
KUBECONFIG=/path/to/extracted-k3s.yaml kubectl get nodes
```

Expected: List of K3s nodes.

---

### Task 4: Deploy staging namespace resources on K3s

**This is a manual task to ensure staging namespace has all required resources.**

**Step 1: Apply staging secrets**

```bash
kubectl apply -f k8s/secrets-staging.yaml
```

**Step 2: Apply staging deployments**

```bash
kubectl apply -f k8s/namespace.yaml
kubectl apply -f k8s/backend/deployment.yaml -n staging
kubectl apply -f k8s/backend/service.yaml -n staging
kubectl apply -f k8s/frontend/deployment.yaml -n staging
kubectl apply -f k8s/frontend/service.yaml -n staging
kubectl apply -f k8s/celery/worker-deployment.yaml -n staging
kubectl apply -f k8s/celery/beat-deployment.yaml -n staging
kubectl apply -f k8s/ingress/middleware-strip-ws.yaml -n staging
kubectl apply -f k8s/ingress/ingress-staging.yaml
```

**Step 3: Apply ghcr-secret in staging namespace**

```bash
kubectl create secret docker-registry ghcr-secret \
  --docker-server=ghcr.io \
  --docker-username=hugofrely \
  --docker-password=<GITHUB_PAT> \
  -n staging
```

**Step 4: Verify pods are running**

```bash
kubectl get pods -n staging
```

Expected: All pods running (or CrashLoopBackOff if no images yet — that's fine, first deploy will fix it).

---

### Task 5: Test the pipeline with a staging tag

**Step 1: Create and push a release candidate tag**

```bash
git tag v0.1.0-rc.1
git push origin v0.1.0-rc.1
```

**Step 2: Monitor the GitHub Actions run**

Go to github.com/hugofrely/crm-qeylo/actions and watch the workflow.

Expected sequence:
1. `determine-env` → outputs `staging`
2. `build` → backend + frontend images pushed to ghcr.io
3. `migrate` → Django migrations run
4. `deploy` → All deployments updated

**Step 3: Verify staging is running**

```bash
kubectl get pods -n staging
curl -k https://staging.qeylo.com/api/health/
```

Expected: Pods running with the new image tag, API responding.

**Step 4: Commit nothing (this is a validation step only)**

---

### Task 6: Test the pipeline with a production tag

**Step 1: Create and push a production tag**

```bash
git tag v0.1.0
git push origin v0.1.0
```

**Step 2: Monitor the GitHub Actions run**

Same as Task 5 but targeting `production` namespace.

**Step 3: Verify production is running**

```bash
kubectl get pods -n production
curl https://qeylo.com/api/health/
```

Expected: Pods running with the new image tag, API responding.
