# KubePeek Docker Image

KubePeek is a snazzy web-based Kubernetes monitoring dashboard that connects to your local Kubernetes configuration to give you a bird's-eye view of all your connected clusters. No more squinting at terminal outputs - see your clusters in style!

## Quick Start

```bash
docker run -d -p 3000:3000 \
 -v $HOME/.kube:/root/.kube \
 -v $HOME/.aws:/root/.aws \
 -e KUBECONFIG=/root/.kube/config \
 --name kubepeek ajsangamithran/kubepeek:latest
```

Then visit http://localhost:3000 in your browser.

## ✨ Features

- 📁 Effortlessly reads from your local Kubernetes configuration files
- 🔍 Displays all the juicy details about your Kubernetes clusters
- 🖥️ View node details including:
  - Node group tags
  - EC2 instance names and types
  - CPU and RAM capacity and utilization
  - Number of running pods
- 🛰️ View pod details including:
  - Helm chart name and version
  - CPU and RAM usage
  - Namespace and other metadata
- 📊 Sortable tables for data organization that's actually pleasant
- 🔄 Drill-down functionality from nodes to pods - click your way to enlightenment!

## Environment Variables

- `KUBECONFIG` - (Optional) Path to kubeconfig file in the container. Defaults to `/home/node/.kube/config`.

## Volume Mounts

- Mount your Kubernetes config directory to `/home/node/.kube` in the container.

## Usage Examples

### Using a custom Kubernetes config file:

```bash
docker run -d -p 3000:3000 --network="host" -v $HOME/.kube:/home/node/.kube -e KUBECONFIG=/home/node/.kube/config ajsangamithran/kubepeek:latest
```

### Changing the port:

```bash
docker run -d -p 8080:3000 --network="host" -v $HOME/.kube:/home/node/.kube ajsangamithran/kubepeek:latest
```

## Troubleshooting

- If you encounter permission issues, make sure your Kubernetes configuration is readable by the container.
- For API access issues, ensure your kubeconfig has valid credentials.
- If you get `ECONNREFUSED` errors connecting to 127.0.0.1:8080, make sure to use the `--network="host"` flag to allow the container to access the Kubernetes API on your host machine.
- For locally running Kubernetes clusters (like minikube, kind, or k3s), the `--network="host"` flag is required.

## Technical Details

- Built with Next.js and TypeScript
- Uses Material-UI (MUI) for UI components
- Leverages the official Kubernetes JavaScript client (@kubernetes/client-node)
- Real-time metrics using Kubernetes Metrics API

## Source Code

The source code for this project is available on GitHub at: https://github.com/yourusername/kubepeek 