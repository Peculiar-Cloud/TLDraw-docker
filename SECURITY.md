# Security Policy

## Supported Versions

Security fixes are applied to the latest published image and the current `main` branch.

## Reporting a Vulnerability

Please report suspected vulnerabilities through GitHub private vulnerability reporting for this repository, or email the Peculiar Cloud maintainers if private reporting is unavailable.

Do not include sensitive canvas data, uploaded assets, or production license keys in public issues.

## Container Security

The published image is designed to:

- run as a non-root user;
- expose only the Node.js server port;
- store mutable state under `/data`;
- publish SBOM and provenance metadata during release builds;
- run vulnerability scans in pull request and release workflows.

The default Compose file also drops Linux capabilities, enables `no-new-privileges`, and uses a read-only root filesystem.
