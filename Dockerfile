# syntax=docker/dockerfile:1.7

ARG NODE_VERSION=26.3.0
ARG PNPM_VERSION=11.6.0

# The application and its production dependencies are architecture-independent
# JavaScript. Run install/build steps natively instead of emulating Node with QEMU.
FROM --platform=$BUILDPLATFORM node:${NODE_VERSION}-alpine AS build-base
WORKDIR /app
ENV PNPM_HOME=/pnpm
ENV PATH="${PNPM_HOME}:${PATH}"
RUN npm install --global "pnpm@${PNPM_VERSION}"

FROM build-base AS deps
ENV NODE_ENV=development
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

FROM deps AS build
COPY . .
RUN pnpm run build

FROM build-base AS prod-deps
ENV NODE_ENV=production
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --prod --frozen-lockfile --ignore-scripts && pnpm store prune

FROM build-base AS runtime-layout
RUN mkdir -p /runtime/data/assets /runtime/data/rooms

FROM cgr.dev/chainguard/node:latest AS runtime
WORKDIR /app
LABEL org.opencontainers.image.title="TLDraw Docker" \
  org.opencontainers.image.description="Rootless-friendly non-root self-hosted tldraw collaboration server" \
  org.opencontainers.image.vendor="Peculiar Cloud" \
  org.opencontainers.image.url="https://peculiar.cloud" \
  org.opencontainers.image.source="https://github.com/Peculiar-Cloud/TLDraw-docker" \
  org.opencontainers.image.documentation="https://github.com/Peculiar-Cloud/TLDraw-docker#readme" \
  org.opencontainers.image.licenses="MIT"

ENV NODE_ENV=production \
  PORT=5858 \
  DATA_DIR=/data \
  TRUSTED_ORIGINS=*

COPY --from=runtime-layout --chown=65532:65532 /runtime/data /data
COPY --from=prod-deps --chown=65532:65532 /app/node_modules ./node_modules
COPY --from=build --chown=65532:65532 /app/dist ./dist
COPY --chown=65532:65532 package.json ./

USER 65532:65532
EXPOSE 5858
VOLUME ["/data"]

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD ["/usr/bin/node", "-e", "fetch('http://127.0.0.1:' + (process.env.PORT || '5858') + '/healthz').then((r) => { if (!r.ok) process.exit(1) }).catch(() => process.exit(1))"]

ENTRYPOINT ["/usr/bin/node"]
CMD ["dist/server/index.js"]
