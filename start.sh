#!/bin/bash

# Exit on error
set -e

echo "🚀 Starting KubePeek Docker environment..."

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
  echo "❌ Docker is not running. Please start Docker and try again."
  exit 1
fi

# Check if docker-compose is installed
if ! command -v docker-compose &> /dev/null; then
  echo "❌ docker-compose is not installed or not in PATH."
  echo "Please install docker-compose or use Docker Desktop which includes it."
  exit 1
fi

# Build and start the containers
echo "🔨 Building and starting containers..."
docker-compose build --no-cache
docker-compose up -d

# Check if the container is running
if [ "$(docker-compose ps -q kubepeek)" ]; then
  echo "✅ KubePeek is now running!"
  echo "📊 Access the application at http://localhost:3000"
  echo "📝 View logs with: docker-compose logs -f kubepeek"
  echo "🛑 To stop: docker-compose down"
else
  echo "❌ Failed to start KubePeek container."
  echo "Check logs with: docker-compose logs kubepeek"
  exit 1
fi 