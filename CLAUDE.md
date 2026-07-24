# KubePeek — notes for coding agents

Lens-style Kubernetes viewer: Next.js 14 (App Router, TypeScript, MUI v5) shipped as an Electron macOS app and a Docker image. Read `docs/architecture.md` before structural changes; `docs/CONTRIBUTING.md` has the step-by-step recipe for adding a new resource view.

## Layer boundary (hard rule)

`app/lib/kubernetes-server.ts` and `helm-server.ts` are **server-only** (Node APIs, kubeconfig, exec-auth). Only `app/api/**` routes may import them. Components/hooks reach data through the API routes via `app/hooks/useFetch.ts`. Never add a server-lib import to a component — it breaks the client bundle.

## UI changes

- Views live in `app/components/<area>/`; reuse `shared/` primitives (`PanelState`, `ScopePicker`, `UsageBar`, `StatusChip`, `CopyButton`) and hooks (`useFetch`, `useFindShortcut` for Cmd+F).
- The main pane is tabbed: `Dashboard` owns `openTabs`/`activeTab`; `ClusterDetails` owns per-view namespace state, the tab strip, and keeps open tabs mounted (`display: none`). New namespace-scoped views must be added to `nsViews` there to get last-namespace seeding for free.
- Styling is MUI `sx` (dense: 32px inputs, 0.75rem table cells). Tailwind is configured but unused — don't introduce it.
- Theme/dark mode: `app/lib/ThemeProvider.tsx` (localStorage + `dark-theme` class on `<html>`).

## Functionality changes

- New Kubernetes read: server function in `kubernetes-server.ts` → thin route under `app/api/clusters/**` (copy the secrets route, keep the `isAuthError` → `401 auth_expired` branch) → summary type in `app/types/kubernetes.ts`.
- `@kubernetes/client-node` is **v0.20**: list APIs take long positional args and responses are `{ response, body }` — read `.body`, and don't copy v1.x object-arg examples from upstream docs.

## Verify

`make typecheck` (tsc) must pass; `npm run dev:web` for a browser-only smoke test, `make dev` for the real Electron app. There is no test suite and `next lint` is unconfigured — don't run it interactively.
