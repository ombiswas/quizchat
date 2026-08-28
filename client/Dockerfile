FROM node:20-alpine

WORKDIR /app

# Install dependencies first (separate layer — cached unless package.json changes)
COPY package.json package-lock.json* ./
RUN npm install

# Copy source (overridden by volume mount in dev docker-compose)
COPY . .

EXPOSE 5173

# Default command — docker-compose overrides with --host for container networking
CMD ["npm", "run", "dev", "--", "--host"]
