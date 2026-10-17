# Contributing

Thanks for your interest in improving KubePeek.

## Getting started

```bash
make install
make dev
```

See [development.md](development.md) for commands and project layout.

## Where things live

- **New Kubernetes read** → add a function to `app/lib/kubernetes-server.ts` (or `helm-server.ts` for Helm) and extend the types in `app/types/kubernetes.ts`. A namespace-scoped list is served by the shared `app/api/clusters/[cluster]/resources/[resource]` route (see the recipe below); anything else gets a thin route under `app/api/clusters/**`.
- **New UI surface** → add a component under the relevant `app/components/<area>/` folder; reuse the primitives in `app/components/shared/` (`NamespacedResourceTable`, `UsageBar`, `TabPanel`, `StatusChip`, `CopyButton`, `PanelState`, `ScopePicker`) and the hooks (`useFetch`, `useFindShortcut`).
- **Formatting / parsing** → `app/lib/format.ts` and `app/lib/log-parsing.ts`.
- **Hard boundary**: components never import the server libs (`kubernetes-server.ts`, `helm-server.ts`); they go through the API routes. Only `app/api/**` may import them.

## Recipe: adding a new resource view (the standard pattern)

Every plain namespace-scoped list (Deployments, StatefulSets, DaemonSets, Jobs, CronJobs, HPA, PDBs, Ingresses) is built this way. Copy one of them, e.g. the CronJobs pieces in each file below. Six steps:

1. **Summary type** — add `FooSummary` to `app/types/kubernetes.ts` (flat, display-ready fields; include `name`, `namespace`, `createdAt` + `age`), and add the view key to the `ActiveView` union.
2. **Server function** — `listFoos(clusterName, namespace)` in `app/lib/kubernetes-server.ts`, calling only the `listNamespaced*` API on a client from `getClientForCluster` (add a `makeApiClient` line there if the API group isn't wired yet). Spread `summaryMeta(obj.metadata)` for the shared fields, map the rest, and `.sort(byName)`.
3. **API route** — add `foos: listFoos` to `LISTERS` in `app/api/clusters/[cluster]/resources/[resource]/route.ts`. The route already rejects unknown keys and a missing namespace, returns `401 auth_expired` for expired credentials (Reconnect banner), and forwards Kubernetes' own message with its status for anything else (e.g. a 403 "forbidden" for missing RBAC, a 404 when the cluster doesn't serve the API).
4. **Table** — export a `FoosTable` from `app/components/workloads/WorkloadTables.tsx`: a `NamespacedResourceTable` with `resource="foos"`, a plural `label` for UI copy, and the columns between the built-in Name and Age columns. Pass `searchText` if search should match more than name + namespace, and `comparators` only for non-scalar sort keys (numbers, strings and nulls sort correctly by default). The shared component handles the `ScopePicker` gate, `useFetch`, the search box with Cmd+F, sorting, `.kp-table-scroll` and `PanelState`. A view with a detail drawer or extra controls (like Secrets or Helm) is its own component instead, copied from `secrets/SecretsTable.tsx`, taking the same `NsTableProps`.
5. **Sidebar** — add the item (view key, label, icon) to `NAV_SECTIONS` in `app/components/NavTree.tsx`.
6. **Tabs wiring** — add the label to `VIEW_LABELS` in `app/lib/views.ts`, and add `foos: FoosTable` to `NS_TABLES` in `app/components/ClusterDetails.tsx`. That's all: `NS_TABLES` drives per-view namespace state, last-namespace seeding, close-reset and rendering. The view's `useFetch` queries inherit active-tab polling, freshness reporting and auth-expiry handling from `RefreshContext`.

Then `make typecheck` and click through: open the tab, pick a namespace, search, sort, close and reopen the tab (it should re-seed the namespace).

## Kubernetes client notes

The project uses `@kubernetes/client-node` v0.20, whose list APIs take long **positional** argument chains (e.g. `fieldSelector` is the 5th argument to `listNamespacedEvent`, the 3rd to `listSecretForAllNamespaces`). Off-by-one mistakes fail silently. Response objects are `{ response, body }` — always read `.body`. Do not copy object-argument snippets from the v1.x upstream docs.

## Before opening a PR

- `make typecheck` is clean
- `npm run lint` is clean (next/core-web-vitals — this is the CI gate)
- `make build` succeeds
- If you touched cluster reads, verify against a real cluster (see the verification notes in the PR)

## Code style

Match the surrounding code: astryx components with props first, then `style`/`className` with token vars (`var(--color-*|--spacing-*|--radius-*)`) — no Tailwind, no raw hex where a token exists. Run `npx astryx component <Name>` for any component's props (see the ASTRYX section in CLAUDE.md). Functional components, local state unless a hook already exists. Keep API routes thin and put logic in the lib layer.
