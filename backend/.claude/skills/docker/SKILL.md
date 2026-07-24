---
name: docker
description: >
  Read for any Docker task: Dockerfile, docker-compose, containerization,
  multi-stage builds, environment config, or CI/CD container setup.
  Read general-guidelines.md → this file.
---

# Docker Skill

## PROJECT DECISIONS

```
Base image:     node:22-alpine (minimal, secure)
Build:          Multi-stage — dev | build | production
User:           Non-root (nestjs:nodejs) — security requirement
Signal handler: dumb-init — proper PID 1 signal handling
Health check:   /api/v1/health endpoint (from HealthModule)
Migrations:     Run before app starts in entrypoint
Node install:   npm ci always — never npm install in Docker
```

---

## DOCKERFILE (production-ready, 3 stages)

```dockerfile
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
RUN addgroup -g 1001 -S nodejs && adduser -S nestjs -u 1001 -G nodejs
WORKDIR /app
COPY --from=build --chown=nestjs:nodejs /app/dist ./dist
COPY --from=build --chown=nestjs:nodejs /app/node_modules ./node_modules
COPY --from=build --chown=nestjs:nodejs /app/package*.json ./
USER nestjs
EXPOSE 3000
ENV NODE_ENV=production
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD curl -f http://localhost:3000/api/v1/health || exit 1
ENTRYPOINT ["dumb-init", "--"]
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/main.js"]
```

---

## .dockerignore

```
node_modules
dist
.git
.env*
*.md
coverage
.nyc_output
test
**/*.spec.ts
**/*.test.ts
Dockerfile*
docker-compose*
.github
```

---

## DOCKER-COMPOSE (full stack — dev)

```yaml
# docker-compose.yml
version: '3.9'

services:
  app:
    build:
      context: .
      dockerfile: Dockerfile
      target: development        # use dev stage locally
    container_name: nestjs-app
    restart: unless-stopped
    ports:
      - '3000:3000'
    volumes:
      - .:/app
      - /app/node_modules        # don't sync node_modules from host
    env_file:
      - .env.development
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    command: npx nest start --watch
    networks:
      - app-network

  postgres:
    image: postgres:16-alpine
    container_name: nestjs-postgres
    restart: unless-stopped
    ports:
      - '5432:5432'
    environment:
      POSTGRES_USER: ${DB_USER:-appuser}
      POSTGRES_PASSWORD: ${DB_PASSWORD:-apppassword}
      POSTGRES_DB: ${DB_NAME:-appdb}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ['CMD-SHELL', 'pg_isready -U ${DB_USER:-appuser}']
      interval: 10s
      timeout: 5s
      retries: 5
    networks:
      - app-network

  redis:
    image: redis:7-alpine
    container_name: nestjs-redis
    restart: unless-stopped
    ports:
      - '6379:6379'
    volumes:
      - redis_data:/data
    healthcheck:
      test: ['CMD', 'redis-cli', 'ping']
      interval: 10s
      timeout: 5s
      retries: 5
    networks:
      - app-network

  # Optional: MongoDB
  mongo:
    image: mongo:7-jammy
    container_name: nestjs-mongo
    restart: unless-stopped
    ports:
      - '27017:27017'
    environment:
      MONGO_INITDB_ROOT_USERNAME: ${MONGO_USER:-root}
      MONGO_INITDB_ROOT_PASSWORD: ${MONGO_PASSWORD:-password}
    volumes:
      - mongo_data:/data/db
    networks:
      - app-network

volumes:
  postgres_data:
  redis_data:
  mongo_data:

networks:
  app-network:
    driver: bridge
```

---

## DOCKER-COMPOSE PRODUCTION

```yaml
# docker-compose.prod.yml
version: '3.9'

services:
  app:
    build:
      context: .
      dockerfile: Dockerfile
      target: production         # use prod stage
    restart: always
    ports:
      - '3000:3000'
    env_file:
      - .env.production
    depends_on:
      - postgres
      - redis
    networks:
      - app-network
```

---

## USEFUL COMMANDS

```bash
# Dev — build and start with hot reload
docker compose up --build

# Prod — build production image
docker build -t my-app:latest --target production .

# Run production image locally
docker run -p 3000:3000 --env-file .env.production my-app:latest

# Shell into running container
docker exec -it nestjs-app sh

# View logs
docker compose logs -f app

# Rebuild only app (after code change)
docker compose up --build app

# Remove everything including volumes (careful!)
docker compose down -v
```

---

## RULES

```
✅ Always multi-stage builds — never single-stage in production
✅ Always non-root user in production
✅ Always dumb-init as ENTRYPOINT for proper signal handling
✅ Always HEALTHCHECK using the /health endpoint
✅ Always npm ci — never npm install
✅ Run migrations before app starts in CMD
✅ Never copy .env files into image — use env_file or env vars at runtime
✅ Always .dockerignore — never copy node_modules or dist into builder

❌ Never use node:latest — always pin version (node:22-alpine)
❌ Never run as root
❌ Never put secrets in Dockerfile or docker-compose
❌ Never use npm install in Docker — npm ci only
```

---

## KEY DOCS

```
Dockerfile reference:   https://docs.docker.com/engine/reference/builder/
Docker Compose:         https://docs.docker.com/compose/
Multi-stage builds:     https://docs.docker.com/build/building/multi-stage/
.dockerignore:          https://docs.docker.com/engine/reference/builder/#dockerignore-file
dumb-init:              https://github.com/Yelp/dumb-init
```