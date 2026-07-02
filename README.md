# TLDraw Docker

[![CI](https://github.com/Peculiar-Cloud/TLDraw-docker/actions/workflows/ci.yml/badge.svg)](https://github.com/Peculiar-Cloud/TLDraw-docker/actions/workflows/ci.yml)
[![Container](https://github.com/Peculiar-Cloud/TLDraw-docker/actions/workflows/container.yml/badge.svg)](https://github.com/Peculiar-Cloud/TLDraw-docker/actions/workflows/container.yml)
[![GHCR](https://img.shields.io/badge/image-ghcr.io%2Fpeculiar--cloud%2Ftldraw--docker-blue)](https://github.com/Peculiar-Cloud/TLDraw-docker/pkgs/container/tldraw-docker)
[![License: MIT](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![Renovate](https://img.shields.io/badge/renovate-enabled-1A1F6C.svg)](renovate.json)
[![Peculiar Cloud](https://img.shields.io/badge/by-Peculiar%20Cloud-111827)](https://peculiar.cloud)

Rootless-friendly, non-root Docker image for a self-hosted, multiplayer tldraw whiteboard.

Peculiar Cloud maintains this repository as a practical, client-facing reference deployment for teams that want a simple self-hosted tldraw environment without giving up modern container and supply-chain hygiene.

This project is not affiliated with tldraw. It packages a small Vite, React, and Fastify application around the tldraw SDK. It stores rooms and uploads on the local filesystem, publishes images to GitHub Container Registry, and runs pull request checks for TypeScript, tests, container build, smoke testing, and image vulnerability scanning.

## Stack

- Node.js 26 runtime.
- pnpm 11 with lockfile supply-chain verification and explicit native build approvals.
- React 19 and Vite 8.
- TypeScript 6 in strict mode.
- tldraw SDK 5.1.
- Chainguard non-root Node runtime with multi-stage builds.
- GHCR multi-architecture images for `linux/amd64` and `linux/arm64`.
- GHCR publishing with platform-only image indexes and GitHub provenance attestations.

## Features

- Multiplayer tldraw rooms using websocket sync.
- Persistent room snapshots and uploaded assets under `/data`.
- Runtime `TLDRAW_LICENSE_KEY` configuration, so the public image does not need to be rebuilt for your license.
- Non-root runtime image using UID/GID `65532`.
- Health endpoints at `/healthz` and `/readyz`.
- Hardened Compose defaults: read-only root filesystem, dropped capabilities, and `no-new-privileges`.
- GHCR image publishing with Trivy scanning and GitHub provenance attestations.
- Renovate configuration for tldraw SDK, pnpm, Docker, Compose, and GitHub Actions updates.

## Documentation

- [Production deployment](docs/production.md)
- [Security model](docs/security.md)
- [Architecture](docs/architecture.md)
- [Release process](docs/releases.md)

## Quick Start

```sh
docker compose up -d
```

Open `http://localhost:5858`.

The default Compose file uses a named volume:

```yaml
volumes:
  tldraw-data:
```

For bind mounts, make sure the container user can write the directory:

```sh
mkdir -p data
sudo chown -R 65532:65532 data
```

## Image

```sh
docker pull ghcr.io/peculiar-cloud/tldraw-docker:latest
```

Useful tags:

- `latest`: latest GitHub release.
- `main`: latest successful build from `main`.
- `sdk-X.Y.Z`: latest `main` build for a specific tldraw SDK version.
- `X.Y.Z`, `X.Y`, and `X`: semantic-version aliases.

The package also has a weekly cleanup workflow that deletes old unreferenced
untagged versions and retired `sha-*` versions while preserving platform
manifests referenced by active tags.

## Configuration

| Variable | Default | Description |
| --- | --- | --- |
| `PORT` | `5858` | HTTP and websocket port. |
| `DATA_DIR` | `/data` | Directory for rooms and uploaded assets. |
| `TRUSTED_ORIGINS` | `*` | Comma-separated allowed browser origins. Use your HTTPS origin in production. |
| `TLDRAW_LICENSE_KEY` | empty | Public tldraw SDK license key passed to the browser at runtime. |
| `ENABLE_UNFURL` | `false` | Enables server-side bookmark metadata fetching. Keep disabled unless you understand SSRF exposure. |
| `MAX_UPLOAD_BYTES` | `52428800` | Maximum upload size in bytes. |

## tldraw License

This repository is MIT licensed, but the tldraw SDK has its own license. Production use of the SDK requires a valid trial, commercial, or hobby license key. Set that key with `TLDRAW_LICENSE_KEY`.

```yaml
environment:
  TLDRAW_LICENSE_KEY: "tldraw-..."
```

The key is sent to the browser because the SDK validates license keys client-side.

## Reverse Proxy

When running behind HTTPS, set `TRUSTED_ORIGINS` to the public origin:

```yaml
environment:
  TRUSTED_ORIGINS: "https://draw.example.com"
```

Your proxy must support websocket upgrades for `/api/connect/*`.

See [Production deployment](docs/production.md) for Nginx, Caddy, and Traefik notes.

## Backups

Back up the `/data` volume. It contains:

- `/data/rooms`: room snapshots;
- `/data/assets`: uploaded images and files.

To restore, stop the container, restore `/data`, and start it again.

## Updates

Renovate opens grouped PRs for the tldraw SDK packages:

- `tldraw`
- `@tldraw/assets`
- `@tldraw/sync`
- `@tldraw/sync-core`

Patch and minor updates can be automerged after CI passes. Major SDK updates require review. The container workflow also runs weekly to rebuild the image and pick up base image security fixes.

## Support

Community issues and pull requests are welcome. For implementation support, hardening reviews, private deployment help, or adjacent consulting work, contact Peculiar Cloud at <https://peculiar.cloud>.

## Verify Published Images

Release builds publish GitHub provenance attestations. After pulling an image, verify the attestation with:

```sh
gh attestation verify oci://ghcr.io/peculiar-cloud/tldraw-docker:latest \
  -R Peculiar-Cloud/TLDraw-docker
```

## Local Development

```sh
pnpm install --frozen-lockfile
pnpm dev
```

The client runs on `http://localhost:5757` and proxies API calls to the server on `http://localhost:5858`.

Run checks:

```sh
pnpm lint
pnpm format:check
pnpm typecheck
pnpm test
pnpm build
docker build -t tldraw-docker:local .
```
