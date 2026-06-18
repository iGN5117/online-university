# syntax=docker/dockerfile:1
# Multi-stage build for the Next.js standalone server. Building inside Docker
# compiles better-sqlite3's native module against the image's Node, so the
# runtime ABI always matches.

FROM node:22-slim AS base
ENV NEXT_TELEMETRY_DISABLED=1

# --- deps: install node_modules with the toolchain better-sqlite3 needs ---
FROM base AS deps
RUN apt-get update && apt-get install -y --no-install-recommends \
      python3 make g++ \
    && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# --- builder: produce .next/standalone ---
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# --- runner: minimal production image ---
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
# Database lives on the mounted volume (see fly.toml).
ENV DB_DIR=/data
ENV PORT=3000 HOSTNAME=0.0.0.0

RUN useradd -m -u 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nextjs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nextjs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000
CMD ["node", "server.js"]
