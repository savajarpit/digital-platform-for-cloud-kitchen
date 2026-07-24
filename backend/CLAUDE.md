# Backend — NestJS SaaS Starter

Read this before ANY task in `backend/`. This project supports MULTI_TENANT,
SINGLE_TENANT, or B2C modes, with PostgreSQL (Prisma) OR MongoDB (Mongoose).

## STEP 1 — Check project type first

Before writing any module, controller, or query, confirm which type this project is.
Check `src/database/database.config.ts` for `PROJECT_TYPE`.

```
MULTI_TENANT  → tenantId on every query, TenantGuard active, Tenant model exists
SINGLE_TENANT → no tenantId anywhere, TenantGuard removed
B2C           → userId scopes data, OwnerGuard instead of TenantGuard
```

If `PROJECT_TYPE` is not set yet — ask before writing any code.

## STEP 2 — general-guidelines skill always applies

The `general-guidelines` skill (architecture laws, folder placement, naming)
applies to every task, every file, every technology in this backend.

## STEP 3 — Pick the right skill for the task

| Task involves | Skill |
|---|---|
| Module, controller, service, guard, interceptor, DTO, Swagger, versioning | `nestjs` |
| PostgreSQL, Prisma schema, migrations, prisma queries | `prisma` |
| MongoDB, Mongoose schema, hooks, populate | `mongoose` |
| Redis, caching, OTP, token blacklist, rate limit storage | `redis` |
| JWT, passwords, bcrypt, CORS, helmet, encryption, auth guards | `auth-security` |
| Stripe, webhooks, payments, subscriptions | `payment` |
| Docker, Dockerfile, docker-compose, containerization | `docker` |
| Git, branches, commits, PR workflow | `git` |
| S3, R2, file upload, presigned URLs, storage | `storage-s3` |
| Bull, queues, background jobs, processors | `queue` |
| Logger, Sentry, request tracing, monitoring | `logging-monitoring` |
| .env, ConfigService, Joi validation, secrets | `environment` |
| Jest, unit tests, e2e tests, mocking | `testing` |

Full reference doc (project types, DB switching, every best practice in depth):
[`docs/nestjs-saas-base.md`](docs/nestjs-saas-base.md).

## Project quick reference

```
Repo:           nestjs-saas-starter
Framework:      NestJS (latest)
Language:       TypeScript strict
Project type:   MULTI_TENANT | SINGLE_TENANT | B2C  ← set this first
DB switch:      DB_DRIVER in src/database/database.config.ts
API prefix:     /api
Versioning:     /api/v1/, /api/v2/ (URI-based)
Auth:           JWT global — @Public() to opt out
Response:       { success, message, data, meta, timestamp }
Port:           3000
Swagger:        http://localhost:3000/api/docs (dev only)
Health:         GET /api/v1/health
```
