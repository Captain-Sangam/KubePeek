# Development

## Requirements

- Node.js 20+
- macOS 13+ for the native app (Docker is cross-platform)
- A reachable kubeconfig at `~/.kube/config` or `$KUBECONFIG`

## Commands

The `Makefile` is a thin wrapper over the npm scripts; either works.

| Command | What it does |
|---|---|
| `make install` | Install dependencies |
| `make dev` | Run the app in development: Next dev server (`localhost:3000`) + an Electron window pointed at it |
| `make build` | Build the Next.js standalone production bundle |
| `make start` | Build and run the standalone server directly (no Electron), on `localhost:3000` |
| `make typecheck` | `tsc --noEmit` |
| `make lint` | `next lint` |
| `make export` | Package `KubePeek.app` into `/Applications`, or `~/Applications` if needed (Spotlight-searchable) |
| `make clean` | Remove `.next` and `dist` |

To develop the UI in a plain browser without Electron, run `npm run dev:web` and open `http://localhost:3000`.

After `npm run build`, `npm start` copies browser assets and `public/` into the standalone bundle before launching it. `make start` performs both steps.

## Project layout

```
app/
  api/clusters/**        Next.js API routes (thin; delegate to lib; server-only)
  lib/
    kubernetes-server.ts  All Kubernetes reads + client/kubeconfig handling (server-only)
    helm-server.ts        Helm release decoding, no helm binary (server-only)
    kubernetes-client.ts  Browser-side helpers (localStorage prefs, display names)
    ThemeProvider.tsx     astryx Theme + light/dark mode (client)
    RefreshContext.tsx     Active-tab refresh policy and header freshness reporting
    capacity-type.ts       Provider-label purchasing classification
    node-groups.ts         Grouping/aggregation of the shared nodes response
    status.ts views.ts     Shared status colors and view labels
    format.ts             Numeric parsing, usage colors, age formatting
    log-parsing.ts        Log line + JSON field parsing (logs fields filter)
  hooks/
    useFetch.ts           Fetch with abort, lazy enable, active-tab polling and freshness
    useFindShortcut.ts    Cmd/Ctrl+F focuses a search input (visible-tab aware)
  components/
    shared/               UsageBar, TabPanel, StatusChip, CopyButton, PanelState,
                          ScopePicker, ReconnectBanner, tableRowClick (Table plugin)
    nodes/ pods/ compute/ logs/ secrets/ helm/ workloads/
  types/kubernetes.ts     Shared TypeScript interfaces (incl. ActiveView)
electron/main.js          Electron main process (spawns the standalone server)
electron-builder.yml      Packaging config (unsigned local app, mac dir target)
Dockerfile                Multi-stage production image
patches/                  Dependency fixes applied by npm postinstall
scripts/prepare-standalone.mjs  Copies browser assets for local npm start
scripts/update-brand-assets.sh  Regenerates logo and icon formats
```

**Layer boundary**: components and hooks never import `kubernetes-server.ts`/`helm-server.ts` — they talk to the API routes with `useFetch`/`fetch`. Only `app/api/**` imports the server libs. Keep it that way; the server libs pull in Node-only modules (`fs`, kubeconfig, exec-auth) that must not reach the client bundle.

## Packaging the native app

`make export` runs `electron-builder --dir` and copies the resulting `KubePeek.app` into Applications. Builds are unsigned and not notarized — no developer certificate required. The `skipped macOS code signing` message is expected because `mac.identity` is explicitly `null`. `npm run dist` builds the same app in `dist/` without installing it into Applications.

Dependency installation applies `patches/tough-cookie+2.5.0.patch` with `patch-package`. The Kubernetes client's cookie dependency otherwise imports Node's deprecated built-in `punycode` module. The patch selects the dependency's existing npm `punycode` package instead; warnings remain enabled. Docker copies the patch before `npm ci` so clean installs use the same fix. Revisit the patch when upgrading the Kubernetes client or `tough-cookie`.

The Electron main process spawns the Next standalone server on a free loopback port and loads it in a `BrowserWindow`. When testing exec-auth clusters (e.g. EKS), **launch the packaged app from Finder/Spotlight** at least once — GUI launches don't inherit your shell `PATH`, and this is the path we repair at startup.

## Running with Docker

Build the image:

```bash
docker build -t kubepeek .
```

Run it, mounting your kubeconfig (and AWS credentials for EKS):

```bash
docker run -d -p 127.0.0.1:3000:3000 \
  -v $HOME/.kube:/root/.kube \
  -v $HOME/.aws:/root/.aws \
  -e KUBECONFIG=/root/.kube/config \
  --name kubepeek kubepeek
```

Then open `http://localhost:3000`.

Notes:
- The container now runs a real production server (`node server.js`), not the dev server.
- Ensure your kubeconfig is readable inside the container and its credentials work from your machine.
- For the published-image command, see [DOCKERHUB.md](../DOCKERHUB.md).

## Documentation screenshots

`assets/showcase.png` is the README's Compute Map overview. `assets/compute-map-light.png` shows the light theme, and `assets/compute-map-hover.png` shows pod information on hover. `assets/node-groups.png`, `assets/nodes.png`, `assets/pods.png`, `assets/secrets.png` and `assets/helm.png` illustrate the other views. These are direct captures of the production browser UI using fictional demo data; secret values stay masked.

Start the screenshot server with an explicit `KUBECONFIG` pointing only to a synthetic API fixture on loopback. Use obvious demo labels such as `Demo cluster`, `demo-node-01` and `demo-apps`; do not capture a live cluster or rely on the default personal kubeconfig. Keep secret values masked even when the fixture contains dummy values.

Use a 1440 × 900 viewport (1000px high for map images and the complete secret dialog), wait for data and theme transitions to settle, and move the pointer away from controls unless the screenshot demonstrates a tooltip. Capture the app viewport without browser chrome. Keep representative long keys and a mix of capacity/status labels. Check both themes across the set, and visually inspect each capture, including hover content, before replacing the assets. Check image metadata for account names, paths, credentials or location data. Preserve `assets/logo.png` and the packaged app icon unless branding changes.

The 2026-10-03 refresh recaptured all eight screenshots with fictional node, group, pod, namespace and release names. Visual and rendered-text checks found no private infrastructure identifiers or exposed values. Each screenshot PNG contains only `IHDR`, `IDAT` and `IEND` chunks, with no text, EXIF or other embedded metadata.

## Branding assets

`assets/logo.png` is the canonical artwork for the README. The 2026-10-04 branding update replaced the previous eye/wordmark with the supplied blue mark, preserving its artwork and white background while stripping text and EXIF metadata. `build/icon.png` and `build/icon.icns` provide the macOS app icon; `public/favicon.ico` provides browser icons at 16, 32, 48, 64, 128 and 256 pixels. The unused `assets/favicon.ico` duplicate was removed.

To regenerate all formats from the canonical logo, run this on macOS with ImageMagick installed:

```sh
bash scripts/update-brand-assets.sh
```

To replace the artwork, pass a source image path as the first argument. The script stages conversions in a temporary directory, strips metadata and uses macOS `iconutil` for the full standard/Retina icon set. Generated assets are checked in, so normal development and builds do not require ImageMagick.

## Troubleshooting

- **CPU/RAM shows n/a** — metrics are unavailable. Check metrics-server and permissions; KubePeek does not substitute zero usage for missing data.
- **EKS cluster shows no data from the packaged app but works from the terminal** — a `PATH`/exec-auth issue; make sure the AWS CLI is installed and launch from Finder once.
- **`next build` fails** — run `make typecheck` to surface the type error.

## Original execution-plan verification (2026-10-03)

Verified with a temporary Kubernetes API fixture, two isolated kubeconfig contexts, Chrome, and the production Docker server. No live cluster was modified and no test framework was added. Polling scenarios used Playwright's controlled clock; visibility was simulated through `document.hidden` and `visibilitychange`.

- Typecheck, lint, and the Node 20 Docker production build passed. The standalone container returned 104 fixture nodes with their provider labels and usage.
- Pods, Secrets, Helm, Ingresses, HPA, and Deployments retained filters and scroll during refresh. Nodes retained scroll. Held requests stayed single-flight across four intervals; background failures retained rows and showed stale freshness. Hidden tabs/window polling paused, visibility restoration refreshed, and auth expiry stopped polling until reconnect.
- Pending namespace changes cleared previous rows, late responses could not overwrite the new scope, and switching clusters reset scope/data. Namespace columns were absent in namespace-scoped Pods/Helm/Secrets and retained for node-scoped Pods.
- Secret checks covered 36 keys, a 248-character key, full-key hover, manual reveal with no decoded-value polling, aligned values, and the height cap. Expanded node rows measured 38.5px high with usage bars below 180px; Memory sort passed in both directions.
- Compute Map opened as the only tab with no namespace read, rendered 104 nodes, capped dots at 40 with overflow counts, and showed pod hover information without card actions. A 30-frame scroll sample measured a 19ms maximum frame interval. A disposable pod deleted through `kubectl` disappeared from Pods and the map on refresh.
- Missing metrics showed `n/a` and no usage bars in the map/groups; node/pod/detail APIs stayed available. Open pod detail CPU/RAM updated within 15 seconds. Eight read endpoints returned `401 auth_expired` for expired fixture credentials. Rapid theme toggles and reduced-motion CSS passed.
- Electron opened successfully and native header/traffic-light clearance was visually checked. Drag/no-drag CSS regions passed runtime inspection. Physical window dragging remains unverified: native computer-use input returned `noWindowsAvailable` despite successful window capture.

## Compute Map pod emphasis verification (2026-10-03)

The production browser build passed typecheck, lint and build checks. Synthetic-data smoke checks verified pod/node hover and keyboard focus, read-only clicks, long names wrapping inside previews, both themes and an 820px-wide viewport without horizontal overflow. Missing-node pods remained visible; unavailable metrics showed `n/a`; empty nodes were summarized; and a 45-second refresh removed a pod and reached the empty state.

With 128 synthetic nodes and 556 pods, the map rendered 548 tiles (including the 40-per-node cap). A 30-frame scroll sample averaged 16ms with a 21ms maximum interval after preview metadata was deferred until opening. The README showcase was recaptured from this build.

## Final documentation, code and regression recheck (2026-10-04)

The recheck found and fixed missing browser assets in local standalone startup and an unsupported purchasing-label fallback that could return an inherited JavaScript object property. Documentation now describes the startup step and distinguishes configured cluster/provider authentication from KubePeek's lack of telemetry.

- Final typecheck, lint, local production build and Node 20 Docker build passed. Starting from a fresh build without standalone assets, `npm start` copied them successfully; all 13 JavaScript/CSS assets and the favicon returned 200. The container served 104 synthetic nodes, including 17 unsupported labels classified as Unknown.
- Browser regressions passed for refresh intervals, single-flight requests, retained filters/sorting/scroll, background failure recovery, hidden windows/tabs, auth expiry/reconnect, and late namespace/cluster responses. Pod CPU/RAM, events and open Helm details refreshed; secret values and logs remained manual reads.
- Namespace columns stayed absent in namespace-scoped Pods/Secrets/Helm and present in node/group-scoped Pods. Long secret keys, aligned capped values, compact expanded node rows, Memory sorting, rapid theme changes, reduced motion and header layout/drag CSS passed. A disposable synthetic pod disappeared from Pods and Compute Map; the rebuilt browser reported no page errors.
- Map hover/focus, read-only clicks, missing-node pods, missing metrics, empty state and long previews passed. With 128 nodes and 556 pods, 548 capped tiles rendered; the 30-frame scroll sample averaged 16ms with a 21ms maximum.
- Quantity parsing, weighted group usage, missing metrics, purchasing-label edge cases and status colors passed helper checks. Thirteen read endpoints returned `401 auth_expired`; missing metrics left node, pod and detail APIs available with `n/a` and null percentages. Client/server imports and package/lockfile consistency passed review.
- All 21 local documentation links resolved. The eight screenshots retained only validated PNG pixel chunks, with no embedded text, EXIF or trailing data; their fictional content and masked values were preserved.

These checks used temporary synthetic APIs and isolated kubeconfigs. No live cluster was modified, and no test framework was added. Physical macOS window dragging remains unverified as recorded above.
