# Contributing

## Local Development

```sh
pnpm install --frozen-lockfile
pnpm dev
```

The Vite dev server runs on `http://localhost:5757` and proxies API calls to the Node server on `http://localhost:5858`.

## Checks

Run the same checks used by pull requests:

```sh
pnpm lint
pnpm format:check
pnpm typecheck
pnpm test
pnpm build
docker build -t tldraw-docker:local .
```

## Dependency Updates

Renovate keeps pnpm dependencies, GitHub Actions, Docker base images, and Compose references up to date. The tldraw SDK packages are grouped so `tldraw`, `@tldraw/sync`, `@tldraw/sync-core`, and `@tldraw/assets` move together.

Stable tldraw SDK updates may be automerged after CI passes, including major releases, so matching container tags can be published without a manual release step.
