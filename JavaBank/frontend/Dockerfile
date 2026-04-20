# syntax=docker/dockerfile:1.7

# ─── JavaBank Frontend - Optimized Multi-Stage Build ───

# Stage 1: Build
FROM node:22-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json* ./
# Install all dependencies (dev + prod) for Next.js build
RUN --mount=type=cache,target=/root/.npm if [ -f package-lock.json ]; then npm ci --no-audit --prefer-offline; else npm install --no-audit --prefer-offline; fi
COPY . .
# Set build-time env vars for browser-safe API access
ENV NEXT_PUBLIC_API_URL=http://localhost:5001/api
RUN npm run build

# Stage 2: Runtime
FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_PUBLIC_API_URL=http://localhost:5001/api
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

EXPOSE 3000
CMD ["node", "server.js"]
