# Wink — production image
#
# libpq is baked in on purpose: the db layer runs pg-native (libpq), the
# only driver that clears Neon pooler SCRAM channel binding. Pure-JS
# drivers all fail auth against it — do not "simplify" this away.

FROM node:20-slim AS builder
RUN apt-get update && apt-get install -y --no-install-recommends \
      libpq-dev build-essential python3 ca-certificates \
    && rm -rf /var/lib/apt/lists/*
WORKDIR /app

# deps first (layer cache) — npm ci compiles pg-native against libpq
COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

# ── runtime ──────────────────────────────────────────────────────────
FROM node:20-slim
RUN apt-get update && apt-get install -y --no-install-recommends \
      libpq5 ca-certificates \
    && rm -rf /var/lib/apt/lists/*
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

COPY --from=builder /app/package.json /app/package-lock.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/next.config.mjs ./
COPY --from=builder /app/drizzle ./drizzle
COPY --from=builder /app/scripts ./scripts

EXPOSE 3000
CMD ["npm", "start"]
