# Features

## Clusters & navigation

- Reads every context from your kubeconfig (`$KUBECONFIG` → `~/.kube/config` → common fallbacks).
- The left sidebar has two parts: a **compact cluster selector** at the top (a dropdown of all clusters; the active one is shown with its server URL) and a **navigation tree** below, grouped into **Compute** (Node Groups, Nodes) and **Workloads** (Pods, Helm, Secrets, Ingresses, HPA, Deployments).
- The main pane is **tabbed**: clicking a sidebar item opens that view as a tab (or focuses it if already open — one tab per view, closable with ×). Each open tab keeps its own state — search text, sorting, namespace, loaded data — when you switch away and back. The app opens on a Pods tab.
- **Namespace memory**: opening a new namespace-scoped tab defaults to the last namespace you picked in any tab (skipping the picker); after that each tab's namespace is independent.
- Rename any cluster to a friendly display name (stored locally) from the selector's menu.
- The sidebar **collapses to an icon rail** (cluster avatar + nav icons with tooltips) to reclaim screen space. The collapsed state is remembered across launches.
- **Cmd+F** (Ctrl+F) focuses the search box of whatever is in front: the active tab's table, the secret detail dialog, or the Helm values/manifest view.
- The native app window (hidden title bar) is **draggable via the top header**.

### Reconnecting after a token expires

EKS/AWS exec credentials are short-lived (often ~1 hour). When a request fails because the credential has expired, KubePeek shows a **Reconnect** banner (rather than a generic error) with a one-click button. Refresh your AWS SSO/VPN session externally, then click Reconnect — no need to disconnect or restart the app.

## Node groups

- Groups nodes by managed-Kubernetes conventions: EKS (`eks.amazonaws.com/nodegroup`), kOps (`kops.k8s.io/instancegroup`), GKE (`cloud.google.com/gke-nodepool`), AKS (`agentpool`).
- Per node group: total CPU/memory, aggregate usage bars, and pod count.
- **Expand a node group** to see its member nodes, each with its own CPU and RAM usage bars and **when it was started** (relative age with a full-timestamp tooltip).
- The **Nodes** sidebar item gives an "Individual Nodes" view with per-node utilization and start times.

## Pods

- **Scoped loading** — pods are never loaded cluster-wide. Opening Pods first asks you to pick a **namespace** or a **node**; only then are the matching pods fetched (server-side, so large clusters stay fast). Clicking a node or node group in the Compute views lands here pre-scoped to that node/node group.
- Change the scope from the toolbar (namespace/node dropdown, or the node-group chip), or use **Change** to pick a different scope.
- Columns: name, namespace, status, **restart count**, CPU and memory **usage bars**, node, age.
- Usage bars show consumption as a percentage of the applicable denominator, following a **limits → requests → node allocatable** fallback. The tooltip states which denominator was used.
- Restart counts are color-coded (amber when > 0, red when high).
- A **search** box filters the loaded pods by name, namespace, status, chart, or node.
- Sorting handles mixed units correctly (e.g. `900Mi` sorts below `1.2Gi`).

## Pod detail

Clicking a pod opens a right-side drawer with three tabs:

- **Overview** — phase, QoS class, conditions, node/node group, creation time; pod-level CPU/memory bars; a per-container breakdown (state + reason, image, restarts, requests/limits, live usage); and metadata (labels, owner references, volumes).
- **Events** — the pod's events (type, reason, message, count, age) newest-first, with a refresh button.
- **Logs** — see below.

A **delete** action (with confirmation) is available in the drawer header; on success the pod list refreshes.

## Logs

- Fetched with timestamps; container and tail-length (100/500/1000/2000) selectors.
- A **search box** (Cmd+F) filters the visible log lines by substring.
- **Fields filter**: structured (JSON) log lines are parsed and their keys flattened to dot-notation. Toggle "Fields" to pick exactly which fields to display — the log view then shows only those values. Includes a searchable key list with Selected/Available sections and All/None shortcuts.
- Log level is color-coded via a left border (ERROR red, WARN yellow, INFO green, DEBUG grey).
- **Previous** toggle shows the previous container's logs — the view you want when a pod is crash-looping.
- Auto-scrolls to the newest line, with a scroll-to-bottom button.

## Secrets

- **Scoped loading** — like Pods, Secrets are never loaded cluster-wide. Pick a **namespace** first; only that namespace's secrets are fetched. Helm release secrets are excluded (they appear under Helm).
- Table (name, namespace, type, key count, age) with search; change namespace from the toolbar.
- **TLS secrets (`kubernetes.io/tls`) are hidden by default** — tick "Show TLS" in the toolbar to include them.
- Clicking a secret opens a dialog listing its keys with values masked. A single **Reveal all / Hide all** button decodes and shows every value (fetched on demand, server-side); each key has a copy button, and binary values are flagged and shown as base64 rather than mangled text. Keys are laid out in a **responsive grid** (up to three columns on wide screens) so secrets with many keys use the horizontal space instead of a long scroll.
- The dialog has its own **key search** (Cmd+F) for secrets with many keys — it matches key names, and values too once revealed.
- A **delete** action (with confirmation) is in the dialog header; on success the secret list refreshes.

## Helm

- Read-only. Releases are decoded directly from their `sh.helm.release.v1` secrets — **no helm binary required**.
- Table: release, namespace, chart, app version, revision, status, updated.
- Clicking a release opens a drawer with **Values** (computed: chart defaults merged with user overrides), **Manifest**, and **History** (all revisions).
- Values and Manifest have a **search box** (Cmd+F) that grep-filters the YAML lines; Copy always copies the full text.

## Deployments, Ingresses & HPA

All three follow the same scoped pattern as Secrets: pick a namespace, then a searchable, sortable table (Cmd+F works), with the namespace changeable from the toolbar.

- **Deployments** — ready (highlighted when below desired), up-to-date, and available replica counts, plus age.
- **Ingresses** — ingress class, hosts, load-balancer address, age.
- **HPA** — scale target reference, min/max/current replicas, and current-vs-target metrics (e.g. `cpu: 62%/80%`), read from `autoscaling/v2`.
