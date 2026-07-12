# Release Process

## Automated Builds

The container workflow publishes to GHCR when:

- `main` changes;
- a `vX.Y.Z` tag is pushed;
- the weekly scheduled rebuild runs;
- the workflow is started manually.

## Tags

| Tag | Meaning |
| --- | --- |
| `latest` | Latest successful build with the newest tldraw SDK on `main`. |
| `main` | Alias of `latest`. |
| `sdk-X.Y.Z` | Build pinned to an exact tldraw SDK version. |
| `sdk-X.Y` | Latest patch release in a tldraw SDK minor line. |
| `sdk-X` | Latest minor release in a tldraw SDK major line. |
| `vX.Y.Z` | Exact release version. |
| `X.Y` | Latest patch in a minor release line. |
| `X` | Latest minor in a major release line. |
| `sha-<commit>` | Immutable commit build. |

## Dependency Updates

Renovate groups the tldraw SDK packages so they update together:

- `tldraw`
- `@tldraw/assets`
- `@tldraw/sync`
- `@tldraw/sync-core`

All stable SDK updates can automerge after CI passes. Renovate is allowed to create update PRs at any time so a successful SDK update publishes on the day it is detected.

## Release Checklist

1. Confirm CI is green.
2. Confirm the container workflow passed.
3. Review Trivy output.
4. Create a GitHub release and tag, for example `v0.1.0`.
5. Confirm GHCR tags were published.
6. Verify the attestation with `gh attestation verify`.
