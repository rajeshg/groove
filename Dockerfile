# Multi-stage build for TanStack Start app
FROM node:22-slim AS base
WORKDIR /app

# Stage 1: Install production dependencies only
FROM base AS deps
COPY package.json package-lock.json ./
RUN npm ci

# Stage 2: Production image
FROM base AS runner

# Create a non-root user
RUN groupadd -g 1001 nodejs && useradd -u 1001 -g nodejs -m -d /home/groove groove

# Copy built application (must be built locally first with: npm run build)
COPY --chown=groove:nodejs ./dist ./dist
COPY --chown=groove:nodejs ./package.json ./package.json
COPY --from=deps --chown=groove:nodejs /app/node_modules ./node_modules
COPY --chown=groove:nodejs ./drizzle ./drizzle
COPY --chown=groove:nodejs ./drizzle.config.ts ./drizzle.config.ts
COPY --chown=groove:nodejs ./server.js ./server.js

# Create directory for SQLite storage
RUN mkdir -p /app/data && chown -R groove:nodejs /app/data && chmod 755 /app/data

# Set environment
ENV NODE_ENV=production
ENV PORT=3000
ENV DATABASE_URL=file:/app/data/todos.db

# Expose port
EXPOSE 3000

# Switch to non-root user
USER groove

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD node -e "const http=require('http');http.get('http://localhost:3000',(r)=>{if(r.statusCode!==200)throw new Error(r.statusCode)}).on('error',()=>process.exit(1))"

# Startup command: Run migrations then start the server
CMD ["sh", "-c", "npx drizzle-kit migrate && node server.js"]
