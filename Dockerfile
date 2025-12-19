# Multi-stage build for optimized production image
# Stage 1: Install production dependencies only (can be cached separately)
FROM node:20-slim AS prod-deps
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

# Stage 2: Install development dependencies (separate for better caching)
FROM node:20-slim AS dev-deps
WORKDIR /app
COPY package*.json ./
RUN npm ci && npm cache clean --force

# Stage 3: Build application with Prisma generation
FROM dev-deps AS builder
WORKDIR /app
COPY prisma ./prisma
COPY prisma.config.ts ./
# Set DATABASE_URL for Prisma generation (points to the fixed path)
ENV DATABASE_URL=file:./prisma/data/data.db
# Generate Prisma client
RUN npx prisma generate
# Copy source and build
COPY . .
RUN npm run build

# Stage 5: Final production image (Debian slim for full glibc support with native bindings)
FROM node:20-slim

# Install OpenSSL and curl
RUN apt-get update -y && apt-get install -y openssl curl && rm -rf /var/lib/apt/lists/*

LABEL org.opencontainers.image.title="Groove" \
      org.opencontainers.image.description="Simplified Trello-like kanban board"

# Create app directory
WORKDIR /app

# Add non-root user for security (Debian format)
RUN groupadd -g 1001 nodejs && useradd -u 1001 -g nodejs groove

# Copy only necessary files from previous stages
COPY --chown=groove:nodejs package*.json ./
COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder /app/build ./build
COPY --chown=groove:nodejs prisma ./prisma
COPY --chown=groove:nodejs prisma.config.ts ./

# Create directory for persistent database storage
RUN mkdir -p /app/prisma/data && chown -R groove:nodejs /app/prisma/data /app/node_modules/@prisma && chmod 755 /app/prisma/data

# Set environment
ENV NODE_ENV=production

# Volume mount point for database persistence
VOLUME ["/app/prisma/data"]

# Expose port
EXPOSE 3000

# Switch to non-root user
USER groove

# Health check - faster startup period since migrations run on first start
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD node -e "const http=require('http');http.get('http://localhost:3000',(r)=>{if(r.statusCode!==200)throw new Error(r.statusCode)}).on('error',()=>process.exit(1))"

# Startup sequence with proper environment variables
CMD ["sh", "-c", "DATABASE_URL=file:/app/prisma/data/data.db npm run db:migrate:prod && npm run start"]
