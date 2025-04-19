# KubePeek Docker Image

KubePeek is a web-based Kubernetes monitoring dashboard that connects to your local Kubernetes configuration to give you a bird's-eye view of all your connected clusters.

## Quick Start

### Option 1: Using standard port mapping (recommended)

```bash
# For macOS/Linux
docker run -d -p 3000:3000 -v $HOME/.kube:/home/node/.kube -e HOST_IP=$(ifconfig | grep -E "([0-9]{1,3}\.){3}[0-9]{1,3}" | grep -v 127.0.0.1 | awk '{ print $2 }' | cut -f2 -d: | head -n1) ajsangamithran/kubepeek:latest
```

Then visit http://localhost:3000 in your browser.

### Option 2: Using host network (Linux only)

```bash
docker run --network="host" -v $HOME/.kube:/home/node/.kube ajsangamithran/kubepeek:latest
```

## Features

- 📁 Reads from your local Kubernetes configuration files
- 🔍 Displays details about your Kubernetes clusters
- 🖥️ View node details including:
  - Node group tags
  - EC2 instance names and types
  - CPU and RAM capacity and utilization
  - Number of running pods
- 🛰️ View pod details including:
  - Helm chart name and version
  - CPU and RAM usage
  - Namespace and other metadata
- 📊 Sortable tables for data organization
- 🔄 Drill-down functionality from nodes to pods

## Environment Variables

- `KUBECONFIG` - (Optional) Path to kubeconfig file in the container. Defaults to `/home/node/.kube/config`.
- `HOST_IP` - (Required for macOS/Windows with port mapping) The host machine's IP address that will be mapped to host.docker.internal in the container.

## Volume Mounts

- Mount your Kubernetes config directory to `/home/node/.kube` in the container.

## Usage Examples

### Running on macOS with Kubernetes on localhost:

```bash
docker run -d -p 3000:3000 -v $HOME/.kube:/home/node/.kube -e KUBECONFIG=/home/node/.kube/config -e HOST_IP=$(ifconfig | grep -E "([0-9]{1,3}\.){3}[0-9]{1,3}" | grep -v 127.0.0.1 | awk '{ print $2 }' | cut -f2 -d: | head -n1) ajsangamithran/kubepeek:latest
```

### Running on Linux with host network:

```bash
docker run -d --network="host" -v $HOME/.kube:/home/node/.kube -e KUBECONFIG=/home/node/.kube/config ajsangamithran/kubepeek:latest
```

## Troubleshooting

- If you encounter permission issues, make sure your Kubernetes configuration is readable by the container.
- For API access issues, ensure your kubeconfig has valid credentials.
- If you get `ECONNREFUSED` errors connecting to 127.0.0.1:8080:
  - On Linux: Use the `--network="host"` flag to allow the container to access the Kubernetes API on your host machine.
  - On macOS/Windows: Docker cannot use host networking properly, so use the standard port mapping approach with the HOST_IP environment variable.
- When using `--network="host"`, do not use the `-p` flag as port mapping is ignored in host network mode.
- If you're using minikube, ensure it's running with `minikube start` before starting the container.

## Source Code

The source code for this project is available on GitHub at: https://github.com/ajsangamithran/kubepeek 