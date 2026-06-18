# =============================================
# Stage 1: Install all dependencies (base layer)
# =============================================
FROM node:20-alpine AS base
WORKDIR /app

# Install system dependencies needed for compiling native packages
RUN apk add --no-cache make gcc g++ python3

# Copy root and workspace package files
COPY package*.json ./
COPY apps/frontend/package*.json ./apps/frontend/
COPY apps/backend/package*.json ./apps/backend/

# =============================================
# Stage 2: Development dependencies (full install)
# =============================================
FROM base AS deps-dev
RUN npm ci

# =============================================
# Stage 3: Production dependencies only
# =============================================
FROM base AS deps-prod
RUN npm ci --omit=dev

# =============================================
# Stage 4: Build frontend assets and backend server
# =============================================
FROM deps-dev AS builder
COPY . .
RUN npm run build

# =============================================
# Stage 5: Production image (minimal footprint)
# =============================================
FROM node:20-alpine AS production
WORKDIR /app

RUN apk add --no-cache dumb-init

# Create non-root user for security
RUN addgroup -g 1001 -S appgroup && adduser -S appuser -u 1001

# Copy workspace directories and built outputs
COPY --from=builder /app/apps/backend ./apps/backend

# Copy production node_modules
COPY --from=deps-prod /app/node_modules ./node_modules


# Set ownership of app files to non-root user
RUN chown -R appuser:appgroup /app

# Switch to non-root user
USER appuser

# Use dumb-init to handle signals properly (PID 1)
ENTRYPOINT ["dumb-init", "--"]

# Health check for container orchestration
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:3000/api/v1/health || exit 1

EXPOSE 3000

# Production: run backend server (which serves the compiled frontend statically)
CMD ["node", "apps/backend/dist-server/server.js"]

# =============================================
# Stage 6: Development image (with hot reload)
# =============================================
FROM deps-dev AS development
WORKDIR /app

COPY . .

EXPOSE 3000 5173

# Development: run both Vite dev server + Express server concurrently via root workspace script
CMD ["npm", "run", "dev"]
