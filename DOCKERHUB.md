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
- 🖥️ Node groups with per-node CPU/RAM usage and node start times
- 🛰️ Pods with restart counts, CPU/RAM usage bars, and filters by namespace, node group, and node
- 🔎 Pod detail drawer: status, per-container breakdown, events, and logs with a JSON fields filter
- 🔐 Secrets — list and reveal decoded values on demand
- ⎈ Helm — read-only releases with values, manifest, and revision history
- 📊 Sortable tables and drill-down from nodes to pods

## Environment Variables

- `KUBECONFIG` - (Optional) Path to kubeconfig file in the container. Defaults to `/root/.kube/config`.

## Volume Mounts

- Mount your Kubernetes config directory to `/root/.kube` in the container.
- For EKS, also mount `/root/.aws` for AWS credentials.

## Usage Examples

### Using a custom Kubernetes config file:

```bash
docker run -d -p 3000:3000 -v $HOME/.kube:/root/.kube -e KUBECONFIG=/root/.kube/config ajsangamithran/kubepeek:latest
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