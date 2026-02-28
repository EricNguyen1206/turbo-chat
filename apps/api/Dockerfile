# ================================================
# DEPENDENCIES STAGE (install dependencies)
# ================================================
FROM node:24.4.1-alpine AS deps

# Install build dependencies
RUN apk add --no-cache libc6-compat python3 make g++

WORKDIR /app

# Copy root package files for workspace
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY .npmrc ./

# Copy package.json files for all packages
COPY apps/api/package.json ./apps/api/
COPY packages/shared/package.json ./packages/shared/
COPY packages/types/package.json ./packages/types/
COPY packages/validators/package.json ./packages/validators/
COPY packages/config/eslint/package.json ./packages/config/eslint/
COPY packages/config/prettier/package.json ./packages/config/prettier/
COPY packages/config/tsconfig/package.json ./packages/config/tsconfig/
COPY packages/config/jest/package.json ./packages/config/jest/

# Install pnpm
RUN npm install -g pnpm

# Install all dependencies
RUN pnpm install --frozen-lockfile

# ================================================
# BUILD STAGE (build the application)
# ================================================
FROM node:24.4.1-alpine AS builder

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm

# Copy everything from deps stage
COPY --from=deps /app ./

# Copy source code
COPY apps/api ./apps/api
COPY packages ./packages

# Build shared packages first
WORKDIR /app/packages/types
RUN pnpm build || true

WORKDIR /app/packages/validators
RUN pnpm build || true

WORKDIR /app/packages/shared
RUN pnpm build || true

# Build the API
WORKDIR /app/apps/api
RUN pnpm build

# ================================================
# RUNTIME STAGE (run the application)
# ================================================
FROM node:24.4.1-alpine AS runner

WORKDIR /app

# Set environment variables
ENV NODE_ENV=production

# Create non-root user for security
RUN addgroup --system --gid 1001 nodejs && \
  adduser --system --uid 1001 expressjs

# Copy entire workspace structure to preserve node_modules links
COPY --from=builder --chown=expressjs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=expressjs:nodejs /app/package.json ./package.json
COPY --from=builder --chown=expressjs:nodejs /app/pnpm-workspace.yaml ./pnpm-workspace.yaml

# Copy API app
COPY --from=builder --chown=expressjs:nodejs /app/apps/api/dist ./apps/api/dist
COPY --from=builder --chown=expressjs:nodejs /app/apps/api/package.json ./apps/api/package.json
COPY --from=builder --chown=expressjs:nodejs /app/apps/api/docs ./apps/api/docs
COPY --from=builder --chown=expressjs:nodejs /app/apps/api/node_modules ./apps/api/node_modules

# Copy built workspace packages
COPY --from=builder --chown=expressjs:nodejs /app/packages/shared ./packages/shared
COPY --from=builder --chown=expressjs:nodejs /app/packages/types ./packages/types
COPY --from=builder --chown=expressjs:nodejs /app/packages/validators ./packages/validators

# Switch to non-root user
USER expressjs

# Set working directory to api app
WORKDIR /app/apps/api

# Expose port
EXPOSE 8080

# Set environment variable for port
ENV PORT=8080
ENV HOST=0.0.0.0

# Health check - use root endpoint which returns status
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:8080/ || exit 1

# Start the application
CMD ["node", "dist/index.js"]
