# ─── Twitter Demo (Next.js) ───
FROM node:22-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 make g++ \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install dependencies
COPY package.json package-lock.json* ./
RUN npm ci

# Copy source code
COPY . .

# Expose port
EXPOSE 3000

# Run Next.js dev server on port 3000
CMD ["npx", "next", "dev", "--turbopack", "-p", "3000"]
