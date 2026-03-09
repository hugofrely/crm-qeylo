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
