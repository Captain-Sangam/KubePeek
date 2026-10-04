# Deployment

KubePeek is a local Kubernetes visibility dashboard. It reads your mounted kubeconfig and uses its existing permissions to show nodes, pods, secrets, Helm releases and workloads.

## macOS app

After installing dependencies with `make install`, run `make export` to build and install `KubePeek.app` into `/Applications`, or `~/Applications` if needed. Launch it from Spotlight or Applications. Local builds are unsigned and not notarized.

To package into `dist/` without installing, run `npm run dist`. See [development.md](development.md#packaging-the-native-app) for packaging details and GUI credential-helper checks.

## Local browser server

Run `make start` to build and launch the production server at [localhost:3000](http://localhost:3000). Run one development or production mode at a time.

## Build a Docker image

From the repository root:

```sh
docker build -t kubepeek .
docker run -d -p 127.0.0.1:3000:3000 \
  -v "$HOME/.kube:/root/.kube" \
  -e KUBECONFIG=/root/.kube/config \
  --name kubepeek kubepeek
```

For EKS, also mount your AWS credentials as shown below. The API server address in your kubeconfig must be reachable inside the container.

## Published Docker image

```bash
docker run -d -p 127.0.0.1:3000:3000 \
 -v "$HOME/.kube:/root/.kube" \
 -v "$HOME/.aws:/root/.aws" \
 -e KUBECONFIG=/root/.kube/config \
 --name kubepeek ajsangamithran/kubepeek:latest
```

Then open [localhost:3000](http://localhost:3000) in your browser.

## Features

- Active-view refresh with last-updated/stale status and preserved filters, sorting and scroll
- Nodes and node groups with CPU/RAM, start times and provider-label Spot/On-Demand/Unknown classification
- Read-only Compute Map with prominent pod tiles and status counts; hover for pod details or supporting node information
- Pods scoped by namespace, node group or node, with restart counts and CPU/RAM bars
- Pod detail, per-container metrics, events and manually refreshed logs with a JSON fields filter
- Namespace-scoped Secrets with masked values, manual reveal and an aligned key grid
- Read-only Helm releases with values, manifest and revision history
- Deployments, Ingresses and HPA tables
- Tabs, contextual header, sortable tables, and fast light/dark theme switching

Nodes and Pods refresh every 15 seconds, resource lists every 30 seconds, and Compute Map every 45 seconds while active. Secret values and logs are fetched manually. Missing metrics show `n/a`; reservation billing coverage is deferred. See the [feature guide](features.md) for details.

## Environment Variables

- `KUBECONFIG` - (Optional) Path to kubeconfig file in the container. Defaults to `/root/.kube/config`.

## Volume Mounts

- Mount your Kubernetes config directory to `/root/.kube` in the container.
- For EKS, also mount `/root/.aws` for AWS credentials.

## Usage Examples

### Using a custom Kubernetes config file:

```bash
docker run -d -p 127.0.0.1:3000:3000 \
  -v /path/to/config:/root/.kube/config:ro \
  -e KUBECONFIG=/root/.kube/config ajsangamithran/kubepeek:latest
```

### Changing the port:

```bash
docker run -d -p 127.0.0.1:8080:3000 \
  -v "$HOME/.kube:/root/.kube" \
  -e KUBECONFIG=/root/.kube/config ajsangamithran/kubepeek:latest
```

## Troubleshooting

- If you encounter permission issues, make sure your Kubernetes configuration is readable by the container.
- For API access issues, ensure your kubeconfig has valid credentials.
- The API server address in your kubeconfig must be reachable from inside the container. A loopback address refers to the container itself; configure a reachable address for a cluster running on the Docker host.
- If CPU/RAM shows `n/a`, check metrics-server and Metrics API permissions.

## Technical Details

- Built with Next.js and TypeScript
- Uses the astryx design system (@astryxdesign/core) for UI components
- Uses the official Kubernetes JavaScript client (@kubernetes/client-node)
- Periodic metrics reads through the Kubernetes Metrics API
- Node.js 20 production standalone server; includes the AWS CLI for EKS exec-auth

## Source Code

Source and documentation: [Captain-Sangam/KubePeek](https://github.com/Captain-Sangam/KubePeek).
