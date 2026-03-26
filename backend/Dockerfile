# ── Stage 1: Build ────────────────────────────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

# ── Stage 2: Production ──────────────────────────────────────────────────────
FROM node:20-alpine
WORKDIR /app

# Security: run as non-root user
RUN addgroup -g 1001 -S hostn && adduser -S hostn -u 1001 -G hostn

# Copy production dependencies
COPY --from=builder /app/node_modules ./node_modules
COPY . .

# Create uploads directory with correct ownership
RUN mkdir -p uploads && chown -R hostn:hostn /app

USER hostn

EXPOSE 5000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:5000/health/live || exit 1

CMD ["node", "src/server.js"]
