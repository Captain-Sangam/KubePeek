# Development

## Requirements

- Node.js 18+
- macOS 13+ for the native app (Docker is cross-platform)
- A reachable kubeconfig at `~/.kube/config` or `$KUBECONFIG`

## Commands

The `Makefile` is a thin wrapper over the npm scripts; either works.

| Command | What it does |
|---|---|
| `make install` | Install dependencies |
| `make dev` | Run the app in development: Next dev server (`localhost:3000`) + an Electron window pointed at it |
| `make build` | Build the Next.js standalone production bundle |
| `make start` | Run the built standalone server directly (no Electron), on `localhost:3000` |
| `make typecheck` | `tsc --noEmit` |
| `make lint` | `next lint` |
| `make export` | Package `KubePeek.app` and install it to `/Applications` (Spotlight-searchable) |
| `make clean` | Remove `.next` and `dist` |

To develop the UI in a plain browser without Electron, run `npm run dev:web` and open `http://localhost:3000`.

## Project layout

```
app/
  api/clusters/**        Next.js API routes (thin; delegate to lib)
  lib/
    kubernetes-server.ts  All Kubernetes reads + client/kubeconfig handling
    helm-server.ts        Helm release decoding (no helm binary)
    format.ts             Numeric parsing, usage colors, age formatting
    log-parsing.ts        Log line + JSON field parsing (logs fields filter)
    useFetch is under app/hooks/
  components/
    shared/               UsageBar, TabPanel, StatusChip, CopyButton, PanelState
    nodes/ pods/ logs/ secrets/ helm/
  types/kubernetes.ts     Shared TypeScript interfaces
electron/main.js          Electron main process (spawns the standalone server)
electron-builder.yml      Packaging config (ad-hoc signed, mac dir target)
Dockerfile                Multi-stage production image
```

## Packaging the native app

`make export` runs `electron-builder --dir` and copies the resulting `KubePeek.app` into Applications. Builds are unsigned (ad-hoc signed on Apple Silicon) — no developer certificate required.

The Electron main process spawns the Next standalone server on a free loopback port and loads it in a `BrowserWindow`. When testing exec-auth clusters (e.g. EKS), **launch the packaged app from Finder/Spotlight** at least once — GUI launches don't inherit your shell `PATH`, and this is the path we repair at startup.

## Running with Docker

Build the image:

```bash
docker build -t kubepeek .
```

Run it, mounting your kubeconfig (and AWS credentials for EKS):

```bash
docker run -d -p 3000:3000 \
  -v $HOME/.kube:/root/.kube \
  -v $HOME/.aws:/root/.aws \
  -e KUBECONFIG=/root/.kube/config \
  --name kubepeek kubepeek
```

Then open `http://localhost:3000`.

Notes:
- The container now runs a real production server (`node server.js`), not the dev server.
- Ensure your kubeconfig is readable inside the container and its credentials work from your machine.
- For a published image, see the DockerHub reference in the project README.

## Troubleshooting

- **Empty CPU/RAM bars everywhere** — the cluster is missing metrics-server. Install it; KubePeek tolerates its absence but can't show usage without it.
- **EKS cluster shows no data from the packaged app but works from the terminal** — a `PATH`/exec-auth issue; make sure the AWS CLI is installed and launch from Finder once.
- **`next build` fails** — run `make typecheck` to surface the type error.
