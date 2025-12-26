# Multi-stage build for TanStack Start app
FROM node:20-slim AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

# Stage 1: Install dependencies
FROM base AS deps
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# Stage 2: Build the application
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Set environment for build
ENV NODE_ENV=production
RUN pnpm build

# Stage 3: Production image
FROM base AS runner
WORKDIR /app

LABEL org.opencontainers.image.title="Groove" \
      org.opencontainers.image.description="Simplified Trello-like kanban board"

# Create a non-root user
RUN groupadd -g 1001 nodejs && useradd -u 1001 -g nodejs groove

# Copy necessary files
COPY --from=builder --chown=groove:nodejs /app/dist ./dist
COPY --from=builder --chown=groove:nodejs /app/package.json ./package.json
COPY --from=builder --chown=groove:nodejs /app/drizzle ./drizzle
COPY --from=builder --chown=groove:nodejs /app/drizzle.config.ts ./drizzle.config.ts

# Create directory for SQLite storage
RUN mkdir -p /app/data && chown -R groove:nodejs /app/data && chmod 755 /app/data

# Set environment
ENV NODE_ENV=production
ENV PORT=3000
ENV DATABASE_URL=file:/app/data/groove.db

# Expose port
EXPOSE 3000

# Switch to non-root user
USER groove

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD node -e "const http=require('http');http.get('http://localhost:3000',(r)=>{if(r.statusCode!==200)throw new Error(r.statusCode)}).on('error',()=>process.exit(1))"

# Startup command: Run migrations then start the server
CMD ["sh", "-c", "pnpm drizzle-kit migrate && node dist/server/server.js"]
