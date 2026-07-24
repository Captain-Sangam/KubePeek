# Changelog

## Unreleased

### Changed
- **New design system**: the entire UI moved from Material-UI (MUI v5 + Emotion) to [astryx](https://github.com/facebook/astryx) (`@astryxdesign/core`, neutral theme) — dense tables with sticky headers that fill the pane, native dropdowns/dialogs, Lucide icons. Dark/light mode behavior is unchanged. Pod/Helm detail panels are now edge-pinned dialogs; cluster rename moved into the cluster dropdown menu; the top bar is a slim drag strip with just the theme toggle.
- **Framework upgrade**: Next.js 14 → 15 and React 18 → 19 (required by astryx). API route handlers now use async `params`.

### Added
- **Tabbed main pane**: every sidebar view opens as a closable tab (one per view). Open tabs keep their state (search, sort, namespace, data) when hidden; new namespace-scoped tabs seed from the last selected namespace; closing a tab resets its scope. Replaces the single-view switching and the redundant cluster-name header row.
- **Deployments, Ingresses, and HPA views** under Workloads — namespace-scoped, searchable, sortable tables following the Secrets pattern (`autoscaling/v2` for HPA targets).
- **Cmd/Ctrl+F** focuses the search box in the visible view — including new search boxes in pod logs (line filter), the secret detail dialog (key/value search), and the Helm drawer's Values/Manifest (grep-style line filter).
- Secrets: **TLS secrets hidden by default** behind a "Show TLS" checkbox.
- The frameless app window is **draggable via the top header**; the app now opens on the Pods view.

### Fixed (this round)
- macOS app: closing the window left the app running with its server killed, so reopening from the Dock hung on a white window until force quit. Closing the window now quits the app. Related: the bundled server ran as a child that registered its own "exec" Dock icon and survived force quit as an orphan — it now runs as an Electron utility process (no Dock icon, dies with the app).
- Pod logs could show a previously viewed pod's logs: the logs tab was reused across pod switches with no stale-response guard. Each pod now gets its own tab instance (`key` per pod), which also resets container/tail selections.

### Added (earlier)
- **Two-part sidebar**: a compact cluster selector on top and a Compute/Workloads navigation tree below, replacing the in-content tab bar. Collapses to an icon rail.
- **Scoped loading** for Pods, Secrets, and Helm: these are never fetched cluster-wide. Pods require a namespace or node scope; Secrets and Helm require a namespace. Filtering moved server-side (`getPods` takes a namespace/node/node-group scope; a new `namespaces` endpoint feeds the pickers). Node/node-group click-through pre-scopes the Pods view.
- **One-click reconnect**: expired-credential requests return `401 auth_expired` and surface a Reconnect banner (plus a header button) instead of a generic error — no app restart needed after refreshing your AWS session.
- **Delete secrets** with confirmation (pod delete already existed; both now refresh their list on success).
- Secret dialog: single **Reveal all / Hide all** toggle and a multi-column layout for secrets with many keys.

### Added (previously)
- **Node group view**: per-node CPU and RAM usage bars and node start times inside each expanded node group.
- **Pods**: restart counts and CPU/memory usage bars (as a percentage of limits → requests → node allocatable); filters by node group and node.
- **Pod detail drawer** (Lens-style): Overview (status, per-container breakdown, live metrics), Events, and Logs tabs, plus a delete-pod action.
- **Logs with a fields filter**: parse JSON log lines, flatten keys, and choose which fields to display; log-level color coding; previous-container logs.
- **Secrets** section: list secrets and reveal decoded values on demand.
- **Helm** section: read-only releases decoded from release secrets (no helm binary) — computed values, manifest, and revision history.
- Collapsible cluster sidebar with an icon-rail mode.
- Native macOS app packaging via Electron (`make export` → `KubePeek.app`).
- Documentation restructured under `docs/`.

### Fixed
- Production build was broken by a stray `'use server'` directive; the Docker image ran the dev server as a result. Now builds and ships a real production server.
- Pod logs `tailLines` was passed as the client's `limitBytes` argument, truncating logs by bytes instead of lines.
- Metrics auth token was applied without awaiting, which could race on exec-auth (EKS) clusters and silently yield empty metrics.
- Pods table sorted CPU/memory as raw strings, mis-ordering mixed units (e.g. `900Mi` vs `1.2Gi`).
- Switching clusters mid-load could show stale data from the previous cluster.

### Changed
- The pod details endpoint now returns a structured `detail` object (was the raw pod / a kubectl-describe fallback).
- Removed the unused legacy `kubernetes.ts` and dead `next.config.ts`.
