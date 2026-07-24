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

<!-- ASTRYX:START -->
Astryx v0.1.8 · 153 components
CLI: run every command as `npx astryx <cmd>` (shown below as `astryx ...`).

SETUP (once, in your app entry e.g. main.tsx) — without these, components render unstyled:
  import "@astryxdesign/core/reset.css";
  import "@astryxdesign/core/astryx.css";

WORKFLOW — discover, don't guess. Before writing UI:
1. `astryx build "<idea>"` — START HERE: returns a kit (closest [page] + [block]s + [component]s). No args = full playbook.
2. `astryx template <name> [--skeleton]` — scaffold the [page]/[block]s it named, or study their layout. Templates are reference code.
3. `astryx component <Name>` — props + examples for every component you use.

RULES:
- No <div> — components do all layout/spacing. Full page → AppShell; sidebar nav → SideNav.
- Frame first: pick the shell (AppShell / Layout+LayoutPanel) and budget regions in px BEFORE writing content (`astryx docs layout`).
- Dense data = rows (Table, List/Item) edge-to-edge — never Card-wrapped list items. Card = dashboard widgets, galleries, settings groups only.
- Status → StatusDot/Token; Badge only for counts and enumerated states, never decoration.
- Custom styling: component props first; else style/className with tokens — var(--color-*|--spacing-*|--radius-*). No raw hex/px. (No StyleX/Tailwind compiler here — don't use xstyle/utility classes.)
- Tokens for every value (`astryx docs tokens`). Brand/accent via `astryx theme` — never override --color-* in :root.
- SELF-CHECK before you finish: re-read the file and replace any raw <div>/<span> layout, imported .css/@apply, or hardcoded value (#hex, 16px) with the component or a token (var(--color-*|--spacing-*|…)). If unsure a component/prop exists, run `astryx component <Name>` / `astryx search "<thing>"`; don't hand-roll CSS.

MORE CLI:
  search "<query>"   find any component / hook / doc / template / block
  component --list   153 components by category
  template --list    page + block recipes
  docs <topic>       color, elevation, icons, illustrations, internationalization, layout, migration, motion, principles, shape, spacing, styling, theme, tokens, typography
  swizzle <Name>     eject component source for deep customization
  upgrade --apply    run after any @astryxdesign/core bump
<!-- ASTRYX:END -->
