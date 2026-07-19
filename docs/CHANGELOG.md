# Changelog

## Unreleased

### Added
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
