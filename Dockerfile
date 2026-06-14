# =============================================
# Stage 1: Install all dependencies (base layer)
# =============================================
FROM node:20-alpine AS base
WORKDIR /app

# Install system dependencies needed for compiling native packages
RUN apk add --no-cache make gcc g++ python3

# Copy package config files
COPY package*.json ./

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
# Stage 4: Build frontend assets for production
# =============================================
FROM deps-dev AS builder
COPY . .
RUN npm run build

# =============================================
# Stage 5: Production image (minimal footprint)
# =============================================
FROM node:20-alpine AS production
WORKDIR /app

# Install only mysql2 native deps (no gcc/g++/python needed at runtime)
RUN apk add --no-cache dumb-init

# Copy production node_modules
COPY --from=deps-prod /app/node_modules ./node_modules

# Copy server source code
COPY server ./server

# Copy built frontend assets
COPY --from=builder /app/dist ./dist

# Copy package.json for runtime
COPY package*.json ./

# Use dumb-init to handle signals properly (PID 1)
ENTRYPOINT ["dumb-init", "--"]

EXPOSE 3000

# Production: run server only, frontend is served as static files
CMD ["node", "server/server.js"]

# =============================================
# Stage 6: Development image (with hot reload)
# =============================================
FROM deps-dev AS development
WORKDIR /app

COPY . .

EXPOSE 3000 5173

# Development: run both Vite dev server + Express
CMD ["npm", "run", "dev:all"]
