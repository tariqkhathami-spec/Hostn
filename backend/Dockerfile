# ── Stage 1: Dependencies ─────────────────────────────────────────────────────
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm install --omit=dev

# ── Stage 2: Production ──────────────────────────────────────────────────────
FROM node:20-alpine
WORKDIR /app

# Security: run as non-root user
RUN addgroup -g 1001 -S hostn && adduser -S hostn -u 1001 -G hostn

# Copy production dependencies (cached unless package*.json changes)
COPY --from=deps /app/node_modules ./node_modules

# Copy config files first (change less often)
COPY package.json railway.toml ./

# Copy source code (changes most often — last layer for cache efficiency)
COPY src ./src

# Copy one-off scripts (migrations, seeds) — needed for Railway pre-deploy commands
COPY scripts ./scripts

# Create uploads directory with correct ownership
# NOTE: uploads/ is ephemeral in containers — use cloud storage in production
RUN mkdir -p uploads && chown -R hostn:hostn /app

USER hostn

EXPOSE 5000

HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:5000/health/live || exit 1

CMD ["node", "src/server.js"]
