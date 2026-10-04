# KubePeek

<img src="assets/logo.png" alt="KubePeek Logo" width="240"/>

**A lightweight Kubernetes visibility app for Mac.**

KubePeek reads your local kubeconfig and gives you a live view of your clusters: node groups with CPU/RAM and purchasing labels, scoped pod tables, and a read-only **Compute Map** with pod information on hover. It also includes pod detail, events and searchable logs, **Secrets** decoded on demand, and **Helm releases** read directly from release secrets — no helm binary required.

Everything runs locally. The app talks to your clusters using your existing kubeconfig and its permissions. There is no KubePeek cloud service or telemetry.

<img src="assets/showcase.png" alt="KubePeek Compute Map with prominent pod tiles, status counts and quiet node captions" width="100%"/>

Screenshots use fictional demo data, with secret values masked. See the map in [light mode](assets/compute-map-light.png) or with [pod hover details](assets/compute-map-hover.png). The native app and browser share the same interface.

> Full documentation lives in [`docs/`](docs/) — see [features](docs/features.md), [architecture](docs/architecture.md), and [development](docs/development.md).

## Requirements

- **macOS 13 (Ventura)** or later (for the native app; Docker works cross-platform)
- **Node.js 20+**
- A kubeconfig at `~/.kube/config` (or `$KUBECONFIG`) with reachable clusters
- For CPU/RAM metrics: [metrics-server](https://github.com/kubernetes-sigs/metrics-server) installed on the cluster
- For EKS: the AWS CLI on your PATH (exec-auth uses `aws eks get-token`)

## Install

```bash
git clone https://github.com/Captain-Sangam/KubePeek.git
cd KubePeek
make install
make dev          # run in development mode (Next dev server + Electron window)
```

To install it as a real app (launchable from Spotlight):

```bash
make export       # installs to /Applications, or ~/Applications if needed
```

Prefer a container? See [Running with Docker](docs/development.md#running-with-docker).

## Features at a glance

- **Tabbed views** — every sidebar item opens as a closable tab that keeps its own state; new tabs default to the last namespace you picked
- **Two-part sidebar** — cluster selector on top; a Compute/Workloads nav tree below (collapses to an icon rail)
- **Live refresh** — active views update automatically while keeping filters, sorting and scroll; the header shows freshness and stale data after a failed refresh
- **Node groups & Nodes** — compact rows with CPU/RAM, start times and Spot/On-Demand/Unknown labels derived from provider labels; reservation billing coverage is deferred
- **Compute Map** — prominent, status-colored pod tiles grouped by node, with pod counts and rich hover details; node capacity and CPU/RAM stay in supporting hover information, with no node or pod actions
- **Pods** — table scoped by namespace, node or node group, with restart counts and CPU/memory usage bars (% of limits → requests → node allocatable); delete with confirmation
- **Pod detail drawer** — status, per-container breakdown, live metrics, events, and logs
- **Logs** — timestamped and searchable, with a JSON fields filter (select which structured fields to show) and previous-container logs for crash loops
- **Secrets** — scoped by namespace; TLS secrets tucked behind a checkbox; decoded values revealed manually in an aligned, searchable grid with full-key hover; delete with confirmation
- **Helm** — read-only releases (scoped by namespace) with searchable computed values, manifest, and revision history
- **Deployments, Ingresses & HPA** — namespace-scoped tables with replica readiness, hosts/addresses, and current-vs-target autoscaler metrics
- **Contextual header & themes** — cluster, active view, scope and freshness in the draggable native header; 100ms light/dark switching with reduced-motion support
- **Cmd+F everywhere** — focuses the search box of whatever view, dialog, or drawer is in front
- **One-click reconnect** — when an EKS/AWS token expires, a Reconnect button restores access without restarting

See [docs/features.md](docs/features.md) for the full list.

## License

MIT
