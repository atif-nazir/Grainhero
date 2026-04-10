# ─────────────────────────────────────────────────────────────
# GrainHero Backend — Node.js / Express Docker Build
# ─────────────────────────────────────────────────────────────
FROM node:20-alpine

WORKDIR /app

# Install build tools for native modules (bcrypt, sharp, etc.)
RUN apk add --no-cache python3 make g++ 

# Copy package files for dependency caching
COPY package.json package-lock.json ./

# Install production dependencies
RUN npm ci --only=production

# Copy source code
COPY . .

# Expose the backend port
EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:5000/status || exit 1

CMD ["node", "server.js"]
