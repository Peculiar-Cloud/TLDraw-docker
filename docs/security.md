# Security Model

This project aims to be safe by default for a small self-hosted deployment, while staying honest about what it does not provide.

## What Is Hardened

- The final runtime image is based on Chainguard Node and runs as non-root UID/GID `65532`.
- Mutable state is isolated under `/data`.
- The default Compose file uses a read-only root filesystem.
- Linux capabilities are dropped in Compose.
- `no-new-privileges` is enabled in Compose.
- `TRUSTED_ORIGINS` can restrict browser origins for HTTP CORS and websocket connections.
- Upload names and room IDs are normalized before touching the filesystem.
- Upload size is bounded by `MAX_UPLOAD_BYTES`.
- Bookmark unfurling is disabled by default.
- CI scans container images with Trivy.
- Release builds publish GitHub provenance attestations.

## What Is Not Included

- Built-in authentication.
- Per-room authorization.
- End-to-end encryption.
- Malware scanning for uploaded files.
- Rate limiting.
- Horizontal scaling.

If you expose this publicly, put it behind your own authentication layer, for example SSO at the reverse proxy or an identity-aware proxy.

## Supply Chain

The project uses pnpm 11 with lockfile verification and explicit build-script approvals. Renovate keeps direct dependencies, GitHub Actions, Docker base images, and tldraw SDK packages current.

Published images include OCI labels and GitHub provenance attestations. BuildKit registry-attached attestations are intentionally disabled so GHCR displays only the real runtime platforms instead of an extra `unknown/unknown` entry.

## Verifying Images

```sh
gh attestation verify oci://ghcr.io/peculiar-cloud/tldraw-docker:latest \
  -R Peculiar-Cloud/TLDraw-docker
```

## Reporting

See [SECURITY.md](../SECURITY.md).
