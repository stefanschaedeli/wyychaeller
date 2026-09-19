FROM node:22-bookworm-slim AS dependencies
WORKDIR /app
# better-sqlite3 ships a prebuilt binary for this platform, but npm still runs
# node-gyp's configure step before it can detect and reuse that prebuild, and
# configure fails without Python. python3/make/g++ satisfy that step only; no
# compilation actually happens because the prebuild is used.
RUN apt-get update && apt-get install -y --no-install-recommends python3 make g++ \
    && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json ./
RUN npm ci

FROM node:22-bookworm-slim AS builder
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=dependencies /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:22-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0 \
    DATA_DIRECTORY=/data
RUN mkdir -p /data /app/.next/cache && chown -R node:node /data /app/.next
COPY --from=builder --chown=node:node /app/public ./public
COPY --from=builder --chown=node:node /app/.next/standalone ./
COPY --from=builder --chown=node:node /app/.next/static ./.next/static
COPY --from=builder --chown=node:node /app/drizzle ./drizzle
USER node
EXPOSE 3000
VOLUME /data
CMD ["node", "server.js"]
