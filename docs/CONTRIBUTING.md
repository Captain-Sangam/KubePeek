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
- **New UI surface** → add a component under the relevant `app/components/<area>/` folder; reuse the primitives in `app/components/shared/` (`UsageBar`, `TabPanel`, `StatusChip`, `CopyButton`, `PanelState`) and the `useFetch` hook.
- **Formatting / parsing** → `app/lib/format.ts` and `app/lib/log-parsing.ts`.

## Kubernetes client notes

The project uses `@kubernetes/client-node` v0.20, whose list APIs take long **positional** argument chains (e.g. `fieldSelector` is the 5th argument to `listNamespacedEvent`, the 3rd to `listSecretForAllNamespaces`). Off-by-one mistakes fail silently. Response objects are `{ response, body }` — always read `.body`. Do not copy object-argument snippets from the v1.x upstream docs.

## Before opening a PR

- `make typecheck` is clean
- `make build` succeeds
- If you touched cluster reads, verify against a real cluster (see the verification notes in the PR)

## Code style

Match the surrounding code: MUI `sx` styling (no Tailwind), functional components, local state unless a hook already exists. Keep API routes thin and put logic in the lib layer.
