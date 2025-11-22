# Liquium Backend Dockerfile
FROM node:20-alpine AS base

# Install build dependencies
RUN apk add --no-cache libc6-compat python3 make g++

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./
COPY prisma ./prisma/

# Install dependencies
FROM base AS dependencies
RUN npm ci

# Generate Prisma Client
RUN npx prisma generate

# Development stage
FROM base AS development
COPY --from=dependencies /app/node_modules ./node_modules
COPY . .

EXPOSE 3000

CMD ["npm", "run", "dev"]

# Build stage
FROM base AS build
COPY --from=dependencies /app/node_modules ./node_modules
COPY . .

RUN npm run build
RUN npm prune --production

# Production stage
FROM node:20-alpine AS production

WORKDIR /app

# Copy only necessary files
COPY --from=build /app/dist ./dist
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package.json ./
COPY --from=build /app/prisma ./prisma

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

USER nodejs

EXPOSE 3000

CMD ["node", "dist/index.js"]
