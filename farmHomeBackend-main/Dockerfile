# ─────────────────────────────────────────────────────────────
# GrainHero Backend — Node.js / Express Docker Build
# ─────────────────────────────────────────────────────────────
FROM node:20-slim
RUN apt-get update && apt-get install -y wget && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install build tools for native modules (bcrypt, sharp, etc.)
RUN apt-get update && apt-get install -y python3 make g++ && rm -rf /var/lib/apt/lists/*

# Copy package files for dependency caching
COPY package.json package-lock.json ./

# Install production dependencies
RUN npm ci --only=production

# Copy source code
COPY . .
RUN mkdir -p data uploads

# Expose the backend port
EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:5000/status || exit 1

CMD ["node", "server.js"]
