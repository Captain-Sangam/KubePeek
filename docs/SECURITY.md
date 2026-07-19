# Security

## Design

KubePeek is a local tool. It runs on your machine, reads your existing kubeconfig, and talks to your clusters with the permissions that kubeconfig already grants. There is no KubePeek cloud service, account, or telemetry.

- **Local only.** All cluster data stays on your machine. Nothing is sent anywhere else.
- **Loopback binding.** In the native app, the embedded server binds to `127.0.0.1` only, so the cluster proxy is not reachable from your LAN.
- **Secrets are decoded on demand.** The secrets list never includes values. Decoded values are fetched only when you explicitly reveal a key, and are never persisted to disk.
- **Read-oriented.** The app is built around reads. The only mutating actions are deleting a pod (behind a confirmation dialog) and renaming a cluster's display name (stored locally). Helm is strictly read-only.
- **Credentials.** The app uses your kubeconfig and cloud credentials (e.g. `~/.aws`) as-is; it does not copy, transmit, or store them.

## Reporting a vulnerability

Please open a private report to the maintainers (or a security advisory on the repository) rather than a public issue. Include reproduction steps and the affected version.

## Supported versions

The latest release on the default branch is supported.
