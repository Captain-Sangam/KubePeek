# Architecture

KubePeek is a Next.js 14 (App Router) application in TypeScript, using Material-UI for the interface and the official Kubernetes JavaScript client. It ships two ways from the same codebase: as a native macOS app (Electron) and as a Docker container.

## Data flow

```
Browser / Electron window
        │  fetch()
        ▼
Next.js API routes  (app/api/clusters/**)
        │  call
        ▼
app/lib/kubernetes-server.ts   ← all Kubernetes access
app/lib/helm-server.ts         ← Helm release decoding
        │
        ▼
kubeconfig  +  Kubernetes API  +  metrics.k8s.io  +  release Secrets
```

- **Routes** are thin: they validate params, parse scope query params, and delegate to library functions. On an expired-credential error they return **401 `{ error: 'auth_expired' }`** (via the shared `isAuthError` classifier) so the UI can distinguish auth failures from other errors.
- **`kubernetes-server.ts`** owns kubeconfig loading, per-cluster client creation, and every read: namespaces, nodes, node groups, pods, pod detail, pod events, pod logs, secrets — plus pod and secret **deletes**. Reads that can be large are **scoped server-side**: `getPods` takes a `{ namespace | nodeName | nodeGroup }` scope (node-group resolves to its member nodes and fans out per-node field-selector queries); secrets and Helm take an optional namespace. Metrics are fetched over a small cert-tolerant HTTPS helper because clusters commonly present self-signed API certs.
- **`helm-server.ts`** lists and decodes Helm releases from their storage secrets (`base64` → `base64` → gzip → JSON). It reuses the cluster client from `kubernetes-server.ts`.
- Value parsing/formatting helpers (`parseCpuValue`, `parseMemoryValue`, `format*ForDisplay`) normalize Kubernetes quantity strings.

## Frontend

- Navigation is a two-part sidebar: `Sidebar` composes `ClusterSelector` (cluster dropdown + rename) and `NavTree` (the data-driven Compute/Workloads groups). `Dashboard` owns the selected cluster and the active view; `ClusterDetails` switches views (no tabs/router — conditional rendering).
- `app/components/` holds the UI, grouped by area: `nodes/`, `pods/`, `logs/`, `secrets/`, `helm/`, and `shared/` (reused primitives: `UsageBar`, `TabPanel`, `StatusChip`, `CopyButton`, `PanelState`, plus `ScopePicker` — the namespace/node gate shown before scoped views load — and `ReconnectBanner`).
- `app/hooks/useFetch.ts` is a small fetch hook with request abortion (prevents a slow response from a previously selected cluster overwriting the current one), lazy enabling (pass `null` to disable, so scoped views fetch only once a scope is chosen), and an `authError` flag that drives the Reconnect banner. Changing scope changes the URL, so refetch/abort come for free.
- Scoped views (Pods, Helm, Secrets) render a `ScopePicker` until a namespace/node is chosen; **Reconnect** simply refetches the enabled queries (which re-runs `aws eks get-token`).
- `app/lib/format.ts` centralizes numeric parsing, usage-color thresholds, and age formatting. `app/lib/log-parsing.ts` parses log lines and flattens JSON fields for the logs fields filter.
- State is local component state; there is no global store. The deepest prop chain is two levels.

## Packaging

### Native app (Electron)

`electron/main.js` starts the Next.js **standalone** production server as a child process on a free `127.0.0.1` port, waits for it to answer, then points a `BrowserWindow` at it. This keeps the entire Next.js app intact — no renderer rewrite. The standalone server bundle is shipped as `extraResources` (not inside asar, which would break Next's dynamic requires). Because the server binds to loopback only, the cluster proxy is not exposed on the LAN.

The app reads `~/.kube/config` and inherits `AWS_*` environment directly. It also repairs `PATH` at startup so credential helpers (e.g. `aws eks get-token`) resolve when launched from Finder.

### Docker

A multi-stage `Dockerfile` builds the standalone server and runs it with `node server.js`. The image includes the AWS CLI for EKS exec-auth. Mount your kubeconfig (and AWS credentials, if any) into the container. See [development.md](development.md#running-with-docker).
