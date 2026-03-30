# ─── NexaBank Frontend ───
FROM node:22-alpine AS base

WORKDIR /app

# Install dependencies
COPY package.json package-lock.json* ./
RUN npm ci

# Copy source code
COPY . .

# Expose port
EXPOSE 3002

# Run Next.js dev server on port 3002
CMD ["npx", "next", "dev", "--turbopack", "-p", "3002"]
