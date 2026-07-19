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

- **Routes** are thin: they validate params and delegate to library functions.
- **`kubernetes-server.ts`** owns kubeconfig loading, per-cluster client creation, and every read: nodes, node groups, pods, pod detail, pod events, pod logs, secrets. Metrics are fetched over a small cert-tolerant HTTPS helper because clusters commonly present self-signed API certs.
- **`helm-server.ts`** lists and decodes Helm releases from their storage secrets (`base64` → `base64` → gzip → JSON). It reuses the cluster client from `kubernetes-server.ts`.
- Value parsing/formatting helpers (`parseCpuValue`, `parseMemoryValue`, `format*ForDisplay`) normalize Kubernetes quantity strings.

## Frontend

- `app/components/` holds the UI, grouped by area: `nodes/`, `pods/`, `logs/`, `secrets/`, `helm/`, and `shared/` (reused primitives: `UsageBar`, `TabPanel`, `StatusChip`, `CopyButton`, `PanelState`).
- `app/hooks/useFetch.ts` is a small fetch hook with request abortion (prevents a slow response from a previously selected cluster overwriting the current one) and lazy enabling (drawers and secondary tabs fetch only when opened).
- `app/lib/format.ts` centralizes numeric parsing, usage-color thresholds, and age formatting. `app/lib/log-parsing.ts` parses log lines and flattens JSON fields for the logs fields filter.
- State is local component state; there is no global store. The deepest prop chain is two levels.

## Packaging

### Native app (Electron)

`electron/main.js` starts the Next.js **standalone** production server as a child process on a free `127.0.0.1` port, waits for it to answer, then points a `BrowserWindow` at it. This keeps the entire Next.js app intact — no renderer rewrite. The standalone server bundle is shipped as `extraResources` (not inside asar, which would break Next's dynamic requires). Because the server binds to loopback only, the cluster proxy is not exposed on the LAN.

The app reads `~/.kube/config` and inherits `AWS_*` environment directly. It also repairs `PATH` at startup so credential helpers (e.g. `aws eks get-token`) resolve when launched from Finder.

### Docker

A multi-stage `Dockerfile` builds the standalone server and runs it with `node server.js`. The image includes the AWS CLI for EKS exec-auth. Mount your kubeconfig (and AWS credentials, if any) into the container. See [development.md](development.md#running-with-docker).
