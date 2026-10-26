# EntertainVerse app server: Next.js + Socket.IO (server.ts). One image runs on every server;
# everything that differs between them (database, Redis, S3, secrets, SERVER_NAME) is set
# through environment variables when the container starts.

FROM node:20-bookworm-slim AS base
# Prisma's query engine needs OpenSSL.
RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

# All dependencies, to build with.
FROM base AS deps
COPY package.json package-lock.json ./
COPY prisma ./prisma
RUN npm ci

# Only what the running app needs (postinstall generates the Prisma client).
FROM base AS prod-deps
COPY package.json package-lock.json ./
COPY prisma ./prisma
# npm installs native binaries for both Linux C libraries; this image is glibc (Debian), so
# the musl (Alpine) copies are dead weight.
RUN npm ci --omit=dev && npm cache clean --force \
  && rm -rf node_modules/@next/swc-linux-x64-musl node_modules/@img/*linuxmusl*

FROM base AS build
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build && rm -rf .next/cache

FROM base AS runtime
ENV NODE_ENV=production HOSTNAME=0.0.0.0 PORT=3000
COPY --chown=node:node . .
COPY --from=prod-deps --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/.next ./.next
USER node
EXPOSE 3000
HEALTHCHECK --interval=10s --timeout=5s --start-period=60s --retries=3 \
  CMD node -e "fetch('http://localhost:'+process.env.PORT+'/api/health').then(r=>process.exit(r.ok?0:1),()=>process.exit(1))"
# Node itself is PID 1 (not npm), so `docker stop` delivers SIGTERM straight to the
# graceful shutdown in server.ts.
CMD ["node", "--import", "tsx", "server.ts"]
