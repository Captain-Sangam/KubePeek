#!/bin/sh

# Check pwd
echo "Current directory: $(pwd)"

# Get current user 
echo "Current user: $(whoami)"

# Get current user's home directory
echo "Current user's home directory: $(echo ~)"

# Get current user's shell
echo "Current user's shell: $(echo $SHELL)"

# Wait a moment to ensure kubeconfig access is ready
sleep 5

# Get the kubectl Clusters
kubectl config current-context

# Start the Next.js application
exec npm start