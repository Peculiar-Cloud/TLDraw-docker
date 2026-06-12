# Production Deployment

## Baseline

Use the published GHCR image and set a valid tldraw SDK license key:

```yaml
services:
  tldraw:
    image: ghcr.io/peculiar-cloud/tldraw-docker:latest
    environment:
      TRUSTED_ORIGINS: "https://draw.example.com"
      TLDRAW_LICENSE_KEY: "tldraw-..."
    volumes:
      - tldraw-data:/data
```

The image runs as a non-root user. The Compose file also drops Linux capabilities, enables `no-new-privileges`, and uses a read-only root filesystem.

The runtime UID/GID is `65532`. For bind mounts, make sure that user can write the host directory. The provided Compose file also enables Docker's built-in `init` process for cleaner signal handling.

## Reverse Proxy

The reverse proxy must support websocket upgrades for `/api/connect/*`.

### Caddy

```caddyfile
draw.example.com {
  reverse_proxy tldraw:5858
}
```

### Nginx

```nginx
location / {
  proxy_pass http://tldraw:5858;
  proxy_http_version 1.1;
  proxy_set_header Host $host;
  proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
  proxy_set_header X-Forwarded-Proto $scheme;
  proxy_set_header Upgrade $http_upgrade;
  proxy_set_header Connection "upgrade";
}
```

### Traefik

Traefik handles websocket upgrades automatically for normal HTTP routers. Set `TRUSTED_ORIGINS` to the external HTTPS origin.

## Backups

Back up `/data`. It contains:

- `/data/rooms`: JSON room snapshots;
- `/data/assets`: uploaded image and file assets.

Stop the container before a filesystem-level restore.

## Upgrades

1. Pull the new image.
2. Read the release notes.
3. Back up `/data`.
4. Restart the container.
5. Confirm `/healthz` and `/readyz`.

Major tldraw SDK updates should be tested in a staging deployment first.

## Resource Sizing

Start small and measure. For light internal use, one small VPS is typically enough. Increase CPU and memory for larger canvases, many active rooms, or high asset upload volume.

## Bookmark Unfurling

`ENABLE_UNFURL=false` by default. Enabling unfurling lets the server fetch arbitrary HTTP(S) URLs provided by browser clients. Treat it as SSRF-sensitive and only enable it in trusted environments or behind additional egress controls.
