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
