#!/bin/bash

# Script to run KubePeek locally with the proper configuration

# Check if KUBECONFIG is set
if [ -z "$KUBECONFIG" ]; then
  # Use default kubeconfig path if not set
  echo "KUBECONFIG not set, using default ~/.kube/config"
  export KUBECONFIG="$HOME/.kube/config"
else
  echo "Using KUBECONFIG from environment: $KUBECONFIG"
fi

# Check if kubeconfig exists
if [ ! -f "$KUBECONFIG" ]; then
  echo "Error: Kubernetes config file not found at $KUBECONFIG"
  echo "Please make sure you have a valid kubeconfig file"
  exit 1
fi

# Start the Next.js application
echo "Starting KubePeek with Kubernetes config: $KUBECONFIG"
npm run dev 