<p align="center">
  <img src="assets/logo.png" width="192" alt="KubePeek logo">
</p>

<h1 align="center">KubePeek</h1>

<p align="center"><strong>A lightweight, local Kubernetes dashboard for macOS and Docker.</strong></p>

KubePeek uses your existing kubeconfig to inspect clusters, workloads, metrics, logs, secrets and Helm releases. Everything runs locally with your kubeconfig's permissions.

![KubePeek Compute Map with prominent pod tiles, status counts and supporting node captions](assets/showcase.png)

Screenshots use fictional demo data with secret values masked.

<details>
<summary>More screenshots</summary>

![Pod hover preview with namespace, age, uptime and pod specifications](assets/compute-map-hover.png)

![Pod name search highlighting matches across node groups](assets/compute-map-search.png)

![Compute Map in light mode](assets/compute-map-light.png)

</details>

## Requirements

- macOS 13 or newer for the native app; Docker works across platforms.
- Node.js 20 or newer when building from source.
- A reachable Kubernetes cluster and a kubeconfig at `~/.kube/config` or `$KUBECONFIG`.
- [metrics-server](https://github.com/kubernetes-sigs/metrics-server) and Metrics API permissions for CPU/RAM readings. Missing metrics display `n/a`.
- The AWS CLI on your `PATH` for EKS exec-auth, or the credential helper configured by your kubeconfig.

## Install

Build and install the macOS app from source:

```sh
git clone https://github.com/Captain-Sangam/KubePeek.git
cd KubePeek
make install
make export
```

Launch **KubePeek** from Spotlight or Applications. The app is installed into `/Applications`, or `~/Applications` if needed. Local builds are unsigned and not notarized; no developer certificate is required.

Select a cluster, then choose a view and scope in the sidebar. If credentials expire, refresh your provider session and click **Reconnect**.

For Docker installation, custom kubeconfigs and EKS credential mounts, see the [deployment guide](docs/deployment.md).

## Documentation

See [docs/](docs/README.md) for features, architecture, development, deployment and security.

Contributions are welcome: [contribution guidelines](CONTRIBUTING.md). Licensed under the [MIT License](LICENSE).
