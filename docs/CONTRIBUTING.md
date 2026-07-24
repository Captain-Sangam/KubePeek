# Contributing

Thanks for your interest in improving KubePeek.

## Getting started

```bash
make install
make dev
```

See [development.md](development.md) for commands and project layout.

## Where things live

- **New Kubernetes read** → add a function to `app/lib/kubernetes-server.ts` (or `helm-server.ts` for Helm), add a thin route under `app/api/clusters/**`, and extend the types in `app/types/kubernetes.ts`.
- **New UI surface** → add a component under the relevant `app/components/<area>/` folder; reuse the primitives in `app/components/shared/` (`UsageBar`, `TabPanel`, `StatusChip`, `CopyButton`, `PanelState`, `ScopePicker`) and the hooks (`useFetch`, `useFindShortcut`).
- **Formatting / parsing** → `app/lib/format.ts` and `app/lib/log-parsing.ts`.
- **Hard boundary**: components never import the server libs (`kubernetes-server.ts`, `helm-server.ts`); they go through the API routes. Only `app/api/**` may import them.

## Recipe: adding a new resource view (the standard pattern)

Deployments, Ingresses, and HPA were added this way; use one of them (e.g. `git log --follow app/components/workloads/DeploymentsTable.tsx`) as the reference diff. Six steps:

1. **Summary type** — add `FooSummary` to `app/types/kubernetes.ts` (flat, display-ready fields; include `createdAt` + `age`), and add the view key to the `ActiveView` union.
2. **Server function** — `listFoos(clusterName, namespace?)` in `app/lib/kubernetes-server.ts`, using a client from `getClientForCluster` (add a `makeApiClient` line there if the API group isn't wired yet). Map to the summary type, sort by name, format age with `relativeAge`.
3. **API route** — `app/api/clusters/[cluster]/foos/route.ts`, copied from the secrets route: validate `cluster`, read `namespace` from the query string, delegate, and keep the `isAuthError` → `401 auth_expired` branch.
4. **Table component** — `app/components/<area>/FoosTable.tsx`, copied from `SecretsTable`: same props (`cluster`, `namespace`, `namespaces`, loading/error, `onNamespaceChange`, `onRetryNamespaces`, `onAuthError`), `ScopePicker` gate when `namespace` is null, `useFetch` on the route, search `TextInput` (ref + `useFindShortcut`), data-driven astryx `Table` with `useTableSortableState`/`useTableSortable` inside a `.kp-table-scroll` div (sticky header + fill-the-pane height), `tableRowClick` plugin if rows open a detail view, `PanelState` around the table.
5. **Sidebar** — add the item (view key, label, icon) to `NAV_SECTIONS` in `app/components/NavTree.tsx`.
6. **Tabs wiring** — in `app/components/ClusterDetails.tsx`: add the label to `TAB_LABELS`, a `fooNamespace` state, an entry in the `nsViews` list (drives last-namespace seeding and close-reset automatically), a line in the per-cluster reset effect, and a `case` in `renderView` (key it with `reloadNonce`, wrap `onNamespaceChange` to also `setLastNamespace`).

Then `make typecheck` and click through: open the tab, pick a namespace, search, sort, close and reopen the tab (it should re-seed the namespace).

## Kubernetes client notes

The project uses `@kubernetes/client-node` v0.20, whose list APIs take long **positional** argument chains (e.g. `fieldSelector` is the 5th argument to `listNamespacedEvent`, the 3rd to `listSecretForAllNamespaces`). Off-by-one mistakes fail silently. Response objects are `{ response, body }` — always read `.body`. Do not copy object-argument snippets from the v1.x upstream docs.

## Before opening a PR

- `make typecheck` is clean
- `make build` succeeds
- If you touched cluster reads, verify against a real cluster (see the verification notes in the PR)

## Code style

Match the surrounding code: astryx components with props first, then `style`/`className` with token vars (`var(--color-*|--spacing-*|--radius-*)`) — no Tailwind, no raw hex where a token exists. Run `npx astryx component <Name>` for any component's props (see the ASTRYX section in CLAUDE.md). Functional components, local state unless a hook already exists. Keep API routes thin and put logic in the lib layer.
