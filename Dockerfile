# Stage 1: Build client
FROM node:20-alpine AS client-build
WORKDIR /app/client
COPY client/package.json client/package-lock.json* ./
RUN npm ci
COPY client/ ./
RUN npm run build

# Stage 2: Production server
FROM node:20-alpine
WORKDIR /app

# Install build deps for better-sqlite3 native module
RUN apk add --no-cache python3 make g++

COPY package.json package-lock.json* ./
RUN npm ci --omit=dev && apk del python3 make g++

COPY src/ ./src/

# Copy built client assets into src/public
COPY --from=client-build /app/src/public/ ./src/public/

EXPOSE 3000

CMD ["node", "src/server.js"]
