#!/bin/sh

# Check pwd
echo "Current directory: $(pwd)"

# Get current user 
echo "Current user: $(whoami)"

# Get current user's home directory
echo "Current user's home directory: $(echo ~)"

# Get current user's shell
echo "Current user's shell: $(echo $SHELL)"

# Start kubectl proxy in background
kubectl proxy --port=8080 &

# Start the Next.js application
exec npm start