#!/bin/sh

# Check pwd
echo "Current directory: $(pwd)"

# Get current user 
echo "Current user: $(whoami)"

# Get current user's home directory
echo "Current user's home directory: $(echo ~)"

# Get current user's shell
echo "Current user's shell: $(echo $SHELL)"

# Make sure storage dir exists with proper permissions
mkdir -p /tmp/kubepeek
chmod 777 /tmp/kubepeek

# Check kubeconfig accessibility
KUBECONFIG_PATH=${KUBECONFIG:-/root/.kube/config}
echo "Checking kubeconfig at: $KUBECONFIG_PATH"

if [ -f "$KUBECONFIG_PATH" ]; then
  echo "Kubeconfig file exists"
  
  # Check file permissions
  ls -la $KUBECONFIG_PATH
  
  # Check if file is readable
  if [ -r "$KUBECONFIG_PATH" ]; then
    echo "Kubeconfig is readable"
  else
    echo "WARNING: Kubeconfig is not readable!"
    # Try to fix permissions
    chmod 644 $KUBECONFIG_PATH
    echo "Attempted to fix permissions. New permissions:"
    ls -la $KUBECONFIG_PATH
  fi
  
  # Wait to ensure kubeconfig access is ready
  sleep 2
  
  # Try to get current context
  echo "Current kubectl context:"
  kubectl config current-context || echo "Failed to get current context"
  
  # List available contexts
  echo "Available kubectl contexts:"
  kubectl config get-contexts || echo "Failed to list contexts"
  
  # Print a quick summary of clusters
  echo "Clusters in config:"
  kubectl config get-clusters || echo "Failed to list clusters"
  
  # Test basic API access
  echo "Testing API server connectivity:"
  kubectl get --raw "/" || echo "Failed to connect to API server"
else
  echo "WARNING: Kubeconfig file not found at $KUBECONFIG_PATH"
  
  # Check common locations
  for path in "$HOME/.kube/config" "/etc/kubernetes/admin.conf" "./config"; do
    if [ -f "$path" ]; then
      echo "Found kubeconfig at alternative location: $path"
      export KUBECONFIG="$path"
      break
    fi
  done
fi

# Check that node is production ready
if [ "$NODE_ENV" = "production" ]; then
  echo "Running in production mode"
else 
  echo "WARNING: Not running in production mode (NODE_ENV=$NODE_ENV)"
fi

# Start the Next.js application
echo "Starting Next.js application..."
exec npm start