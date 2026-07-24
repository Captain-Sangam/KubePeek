# Architecture

KubePeek is a Next.js 15 (App Router, React 19) application in TypeScript, using the astryx design system (`@astryxdesign/core`) for the interface and the official Kubernetes JavaScript client. It ships two ways from the same codebase: as a native macOS app (Electron) and as a Docker container.

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
- **`kubernetes-server.ts`** owns kubeconfig loading, per-cluster client creation, and every read: namespaces, nodes, node groups, pods, pod detail, pod events, pod logs, secrets, deployments, ingresses, HPAs — plus pod and secret **deletes**. Reads that can be large are **scoped server-side**: `getPods` takes a `{ namespace | nodeName | nodeGroup }` scope (node-group resolves to its member nodes and fans out per-node field-selector queries); secrets and Helm take an optional namespace. Metrics are fetched over a small cert-tolerant HTTPS helper because clusters commonly present self-signed API certs.
- **`helm-server.ts`** lists and decodes Helm releases from their storage secrets (`base64` → `base64` → gzip → JSON). It reuses the cluster client from `kubernetes-server.ts`.
- Value parsing/formatting helpers (`parseCpuValue`, `parseMemoryValue`, `format*ForDisplay`) normalize Kubernetes quantity strings.

## Frontend

- Navigation is a two-part sidebar: `Sidebar` composes `ClusterSelector` (cluster dropdown + rename) and `NavTree` (the data-driven Compute/Workloads groups). `Dashboard` owns the selected cluster and the **tab state** (`openTabs: ActiveView[]` + `activeTab`): a sidebar click opens a view's tab if absent and focuses it (max one tab per view); closing the active tab focuses its right neighbor.
- `ClusterDetails` renders the tab strip (astryx `TabList`/`Tab` with the close icon in `endContent` as a clickable span, since a button can't nest inside a Tab's button) and **keeps every open tab mounted**, hiding inactive ones with `display: none`, so each tab's search/sort/namespace/data survive switching. It also owns per-view scope state and `lastNamespace`: a newly opened namespace-scoped tab is seeded from the last namespace picked anywhere (a prev-tabs diff effect — seeding keys off "tab newly opened", not "scope is null", so the Pods "Change scope" flow isn't clobbered); closing a tab resets its scope.
- `app/components/` holds the UI, grouped by area: `nodes/`, `pods/`, `logs/`, `secrets/`, `helm/`, `workloads/` (Deployments, Ingresses, HPA), and `shared/` (reused primitives: `UsageBar`, `TabPanel`, `StatusChip`, `CopyButton`, `PanelState`, plus `ScopePicker` — the namespace/node gate shown before scoped views load — and `ReconnectBanner`).
- `app/hooks/useFetch.ts` is a small fetch hook with request abortion (prevents a slow response from a previously selected cluster overwriting the current one), lazy enabling (pass `null` to disable, so scoped views fetch only once a scope is chosen), and an `authError` flag that drives the Reconnect banner. Changing scope changes the URL, so refetch/abort come for free.
- `app/hooks/useFindShortcut.ts` binds Cmd/Ctrl+F to a search input ref. It ignores inputs inside `display: none` subtrees (`offsetParent === null`), so with several tabs mounted only the visible one claims the shortcut; drawers/dialogs mount later and win while open.
- Scoped views (Pods, Helm, Secrets, Deployments, Ingresses, HPA) render a `ScopePicker` until a namespace/node is chosen; **Reconnect** simply refetches the enabled queries (which re-runs `aws eks get-token`).
- `app/lib/format.ts` centralizes numeric parsing, usage-color thresholds, and age formatting. `app/lib/log-parsing.ts` parses log lines and flattens JSON fields for the logs fields filter.
- State is local component state; there is no global store. The deepest prop chain is two levels.

## Packaging

### Native app (Electron)

`electron/main.js` starts the Next.js **standalone** production server as a child process on a free `127.0.0.1` port, waits for it to answer, then points a `BrowserWindow` at it. This keeps the entire Next.js app intact — no renderer rewrite. The standalone server bundle is shipped as `extraResources` (not inside asar, which would break Next's dynamic requires). Because the server binds to loopback only, the cluster proxy is not exposed on the LAN.

The app reads `~/.kube/config` and inherits `AWS_*` environment directly. It also repairs `PATH` at startup so credential helpers (e.g. `aws eks get-token`) resolve when launched from Finder.

### Docker

A multi-stage `Dockerfile` builds the standalone server and runs it with `node server.js`. The image includes the AWS CLI for EKS exec-auth. Mount your kubeconfig (and AWS credentials, if any) into the container. See [development.md](development.md#running-with-docker).
