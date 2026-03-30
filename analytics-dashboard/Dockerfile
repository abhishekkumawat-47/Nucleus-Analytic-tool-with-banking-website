# ─── Analytics Dashboard (Next.js) ───
FROM node:22-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 make g++ \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install dependencies
COPY package.json package-lock.json* ./
RUN npm ci --legacy-peer-deps

# Copy source code
COPY . .

# Expose port
EXPOSE 3001

# Run Next.js dev server on port 3001
CMD ["npx", "next", "dev", "--turbopack", "-p", "3001"]
