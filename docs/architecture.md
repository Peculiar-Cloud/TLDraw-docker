# Architecture

TLDraw Docker is intentionally small: one Node.js process serves the web app, websocket sync, uploads, and health endpoints.

## Runtime Components

| Component | Responsibility |
| --- | --- |
| Vite client | React UI and tldraw editor. |
| Fastify server | HTTP, websocket upgrade, health endpoints, static files. |
| tldraw sync | Room collaboration over websockets. |
| Filesystem storage | Room snapshots and uploaded assets under `/data`. |

## Request Flow

1. Browser loads the static app from the Node server.
2. Browser calls `/api/config` to receive public runtime settings.
3. Browser connects to `/api/connect/:roomId` over websockets.
4. The server creates or loads a room snapshot from `/data/rooms`.
5. Uploaded assets are stored under `/data/assets`.
6. Dirty room snapshots are flushed periodically and on shutdown.

## Persistence

The app is designed for a single container instance with persistent local storage. Run it with a named Docker volume or bind mount. For horizontal scaling, the storage and room coordination model would need to move to a shared backend.

## Non-Goals

- Authentication and authorization.
- Multi-tenant isolation.
- Horizontal room sharding.
- Managed database support.
- Object storage support.

Those are reasonable extensions, but this repository keeps the first public release focused on a reliable single-node deployment.
