# Features

## Clusters

- Reads every context from your kubeconfig (`$KUBECONFIG` → `~/.kube/config` → common fallbacks).
- Left sidebar lists clusters; rename any cluster to a friendly display name (stored locally).
- The sidebar **collapses to an icon rail** (cluster initials with tooltips) to reclaim screen space. The collapsed state is remembered across launches.

## Node groups

- Groups nodes by managed-Kubernetes conventions: EKS (`eks.amazonaws.com/nodegroup`), kOps (`kops.k8s.io/instancegroup`), GKE (`cloud.google.com/gke-nodepool`), AKS (`agentpool`).
- Per node group: total CPU/memory, aggregate usage bars, and pod count.
- **Expand a node group** to see its member nodes, each with its own CPU and RAM usage bars and **when it was started** (relative age with a full-timestamp tooltip).
- Toggle to an "Individual Nodes" view with per-node utilization and start times.

## Pods

- Columns: name, namespace, status, **restart count**, CPU and memory **usage bars**, node, age.
- Usage bars show consumption as a percentage of the applicable denominator, following a **limits → requests → node allocatable** fallback. The tooltip states which denominator was used.
- Restart counts are color-coded (amber when > 0, red when high).
- **Filter** by namespace, node group, and node. Clicking a node or node group in the Nodes tab pre-populates these filters.
- Sorting handles mixed units correctly (e.g. `900Mi` sorts below `1.2Gi`).

## Pod detail

Clicking a pod opens a right-side drawer with three tabs:

- **Overview** — phase, QoS class, conditions, node/node group, creation time; pod-level CPU/memory bars; a per-container breakdown (state + reason, image, restarts, requests/limits, live usage); and metadata (labels, owner references, volumes).
- **Events** — the pod's events (type, reason, message, count, age) newest-first, with a refresh button.
- **Logs** — see below.

A **delete** action (with confirmation) is available in the drawer header.

## Logs

- Fetched with timestamps; container and tail-length (100/500/1000/2000) selectors.
- **Fields filter**: structured (JSON) log lines are parsed and their keys flattened to dot-notation. Toggle "Fields" to pick exactly which fields to display — the log view then shows only those values. Includes a searchable key list with Selected/Available sections and All/None shortcuts.
- Log level is color-coded via a left border (ERROR red, WARN yellow, INFO green, DEBUG grey).
- **Previous** toggle shows the previous container's logs — the view you want when a pod is crash-looping.
- Auto-scrolls to the newest line, with a scroll-to-bottom button.

## Secrets

- Lists secrets across namespaces (name, namespace, type, key count, age), searchable and filterable by namespace. Helm release secrets are excluded (they appear under Helm).
- Clicking a secret opens a dialog listing its keys with values masked. Each key has an **eye toggle** that decodes and reveals the value (fetched on demand, server-side) and a copy button. Binary values are flagged and shown as base64 rather than mangled text.

## Helm

- Read-only. Releases are decoded directly from their `sh.helm.release.v1` secrets — **no helm binary required**.
- Table: release, namespace, chart, app version, revision, status, updated.
- Clicking a release opens a drawer with **Values** (computed: chart defaults merged with user overrides), **Manifest**, and **History** (all revisions).
