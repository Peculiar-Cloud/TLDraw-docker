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
| `main` | Latest successful build from `main`. |
| `sdk-X.Y.Z` | Latest `main` build for a specific tldraw SDK version. |
| `latest` | Latest versioned release. |
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

Patch and minor SDK updates can automerge after CI passes. Major SDK updates require manual approval and release note review.

## Release Checklist

1. Confirm CI is green.
2. Confirm the container workflow passed.
3. Review Trivy output.
4. Create a GitHub release and tag, for example `v0.1.0`.
5. Confirm GHCR tags were published.
6. Verify the attestation with `gh attestation verify`.
