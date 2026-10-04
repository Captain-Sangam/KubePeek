# Contributing to KubePeek

Report bugs and propose changes through [GitHub issues](https://github.com/Captain-Sangam/KubePeek/issues). Keep pull requests focused and describe the change and how you checked it.

## Set up

Follow the [README](README.md#install), then run `make dev`. A reachable cluster and kubeconfig are needed for cluster views.

## Before opening a pull request

For code changes, run:

```sh
make typecheck
npm run lint
make build
```

Check affected views against a suitable cluster when changing cluster reads. For documentation-only changes, check links, images and commands instead.

See the [detailed contributor guide](docs/CONTRIBUTING.md) for code boundaries and the resource-view recipe, and the [development guide](docs/development.md) for local commands.

Report vulnerabilities through the [security policy](docs/SECURITY.md#reporting-a-vulnerability). Contributions are made under the [MIT License](LICENSE).
