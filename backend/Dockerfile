# ── Stage 1: Development ──────────────────────────────────
FROM node:22-alpine AS development
RUN apk add --no-cache libc6-compat
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
USER node

# ── Stage 2: Build ────────────────────────────────────────
FROM node:22-alpine AS build
WORKDIR /app
COPY package*.json ./
COPY --from=development /app/node_modules ./node_modules
COPY . .
RUN npm run build
RUN npm prune --omit=dev && npm cache clean --force

# ── Stage 3: Production ───────────────────────────────────
FROM node:22-alpine AS production
RUN apk add --no-cache dumb-init curl
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nestjs -u 1001 -G nodejs
WORKDIR /app
COPY --from=build --chown=nestjs:nodejs /app/dist ./dist
COPY --from=build --chown=nestjs:nodejs /app/node_modules ./node_modules
COPY --from=build --chown=nestjs:nodejs /app/package*.json ./
USER nestjs
EXPOSE 3000
ENV NODE_ENV=production
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD curl -f http://localhost:3000/api/v1/health/ping || exit 1
ENTRYPOINT ["dumb-init", "--"]
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/main.js"]
```

---

## Round 6 — File 5: `.dockerignore`
```
node_modules
dist
.git
.gitignore
.env
.env.*
!.env.example
*.md
coverage
.nyc_output
test
**/*.spec.ts
**/*.test.ts
Dockerfile*
docker-compose*
.github
src/generated