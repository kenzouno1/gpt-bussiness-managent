# Stage 1: Build client
FROM node:20-alpine AS client-build
WORKDIR /app/client
COPY client/package.json client/package-lock.json* ./
RUN npm ci
COPY client/ ./
RUN npm run build

# Stage 2: Build native deps (better-sqlite3)
FROM node:20-alpine AS server-deps
WORKDIR /app
RUN apk add --no-cache python3 make g++
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev

# Stage 3: Production (minimal image)
FROM node:20-alpine
WORKDIR /app

# Security: non-root user
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

# Copy pre-built node_modules (no build tools in final image)
COPY --from=server-deps /app/node_modules ./node_modules
COPY package.json ./
COPY src/ ./src/
COPY docker-entrypoint.sh ./

# Copy built client assets
COPY --from=client-build /app/src/public/ ./src/public/

# Data directory for SQLite
RUN mkdir -p /app/data && chown -R appuser:appgroup /app/data
VOLUME ["/app/data"]

USER appuser

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=3s --retries=3 \
  CMD wget -qO- http://localhost:3000/api/health || exit 1

ENTRYPOINT ["sh", "docker-entrypoint.sh"]
