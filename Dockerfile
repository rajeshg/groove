# Multi-stage build for optimized production image
# Stage 1: Install development dependencies for building
FROM node:20-alpine AS development-dependencies-env
COPY . /app
WORKDIR /app
RUN npm ci
RUN npx prisma generate

# Stage 2: Install production dependencies only
FROM node:20-alpine AS production-dependencies-env
COPY ./package.json package-lock.json /app/
WORKDIR /app
RUN npm ci --omit=dev
COPY ./prisma /app/prisma
RUN npx prisma generate

# Stage 3: Build the React Router app
FROM node:20-alpine AS build-env
COPY . /app/
COPY --from=development-dependencies-env /app/node_modules /app/node_modules
WORKDIR /app
RUN npm run build

# Stage 4: Final production image
FROM node:20-alpine
ENV NODE_ENV=production
COPY ./package.json package-lock.json /app/
COPY --from=production-dependencies-env /app/node_modules /app/node_modules
COPY --from=production-dependencies-env /app/prisma /app/prisma
COPY --from=build-env /app/build /app/build
WORKDIR /app
EXPOSE 3000

# ============================================================================
# DATABASE CONFIGURATION & PERSISTENT STORAGE
# ============================================================================
# Directory Structure:
#   /app/prisma/              - Source code (schema.prisma, migrations/)
#   /data/db/                 - Runtime database files (persistent volume)
#
# Database Location:
#   - SQLite database file: /data/db/prod.db
#   - Configured via DATABASE_URL environment variable
#
# Volume Mount Strategy:
#   ONLY mount /data/db for database persistence
#   This keeps /app/prisma (with migrations) from the container image
#
# IMPORTANT:
#   - Without /data/db volume, database is lost on container restart
#   - Migrations are always part of the container image
#   - Only the database file persists via volume mount
#
# Docker run example:
#   docker run \
#     -v groove-db:/data/db \
#     -e DATABASE_URL="file:/data/db/prod.db" \
#     -e APP_URL="http://localhost:3000" \
#     -e SMTP_HOST="smtp.gmail.com" \
#     -e SMTP_PORT="587" \
#     -e SMTP_USER="your-email@gmail.com" \
#     -e SMTP_PASS="your-app-password" \
#     -e EMAIL_FROM="Groove <noreply@yourdomain.com>" \
#     -p 3000:3000 \
#     myapp:latest
#
# Or with an env file:
#   docker run \
#     -v groove-db:/data/db \
#     --env-file .env.production \
#     -p 3000:3000 \
#     myapp:latest
#
# Environment Variables Required:
#   - DATABASE_URL: "file:/data/db/prod.db" (REQUIRED for persistence)
#   - NODE_ENV: "production" (default)
#   - APP_URL: Application URL for redirects
#   - SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS: Email config
#   - EMAIL_FROM: Sender email address
# ============================================================================

# Create directory for persistent database storage
RUN mkdir -p /data/db

# Volume mount point for database persistence ONLY
# Keep migrations and schema in the container image
VOLUME ["/data/db"]

# Health check to ensure app is running
# Checks if the app responds to HTTP requests
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})"

# Startup sequence:
# 1. Run Prisma migrations (db:migrate:prod) - idempotent, safe to re-run
# 2. Start the React Router app (npm run start)
#
# Migrations ensure database schema is always up-to-date when container starts
CMD ["sh", "-c", "npm run db:migrate:prod && npm run start"]
