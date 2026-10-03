# Security

## Design

KubePeek is a local tool. It runs on your machine, reads your existing kubeconfig, and talks to your clusters with the permissions that kubeconfig already grants. There is no KubePeek cloud service, account, or telemetry.

- **Local display.** Cluster responses are displayed locally; KubePeek has no telemetry or external data collector.
- **Loopback binding.** In the native app, the embedded server binds to `127.0.0.1` only, so the cluster proxy is not reachable from your LAN.
- **Secrets are decoded on demand.** The secrets list response never includes values. Decoded values are fetched only through **Reveal all**, never polled or persisted to disk, and cleared when the dialog closes or changes its target.
- **Read-oriented.** The only cluster mutations are deleting a pod or a secret, each behind a confirmation dialog. Renaming a cluster's display name is local. Helm and Compute Map are read-only; the map reads cluster-wide pod summaries to show placement and hover information.
- **Credentials.** The app reads your existing kubeconfig and uses its configured credential helpers. Authentication is sent to the configured Kubernetes API and any provider endpoints used by those helpers; KubePeek does not persist a separate credential store or send credentials to a KubePeek service.

## Reporting a vulnerability

Please open a private report to the maintainers (or a security advisory on the repository) rather than a public issue. Include reproduction steps and the affected version.

## Supported versions

The latest release on the default branch is supported.
