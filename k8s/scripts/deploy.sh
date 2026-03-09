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

# Deploy application (PostgreSQL and Redis are external services)
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
