---
name: general-guidelines
description: >
  Read this before ANY backend task in this project.
  Core architecture rules, folder placement, naming, and laws every file must follow.
  All other skills build on top of this.
---

# General Guidelines

## PROJECT TYPE — CHECK THIS FIRST

Before writing any module, schema, query, or guard — confirm the project type.

```
MULTI_TENANT  → tenantId on every tenant-scoped query, TenantGuard active
SINGLE_TENANT → no tenantId anywhere, TenantGuard removed
B2C           → userId scopes data instead of tenantId, OwnerGuard active
```

| Concern | MULTI_TENANT | SINGLE_TENANT | B2C |
|---|---|---|---|
| Query scope | `{ tenantId }` | none | `{ userId }` |
| Active guard | TenantGuard | none | OwnerGuard |
| JWT payload | sub + email + role + tenantId | sub + email + role | sub + email + role |
| Tenant model | ✅ exists | ❌ remove | ❌ remove |

If not sure which type — ask before writing code.

---

## THE THREE LAWS
1. **Controllers** — HTTP only. Receive → validate DTO → call service → return. Nothing else.
2. **Services** — Business logic only. No HTTP imports. No direct DB calls. Throws NestJS exceptions.
3. **Repositories** — Data access only. Only layer that knows Prisma or Mongoose. Returns data or null.

```
Request → Controller → Service → Repository → Database
```

---

## FOLDER PLACEMENT

| File type | Location |
|---|---|
| Controller / Service / Module | `src/modules/[feature]/` |
| Repository | `src/modules/[feature]/[feature].repository.ts` |
| DTOs | `src/modules/[feature]/dto/` |
| Mongoose schema | `src/modules/[feature]/schemas/[feature].schema.ts` |
| Guards (shared) | `src/common/guards/` |
| Decorators (shared) | `src/common/decorators/` |
| Interceptors | `src/common/interceptors/` |
| Interfaces / Enums | `src/common/interfaces/` `src/common/enums/` |
| Utils | `src/common/utils/` |
| Config | `src/config/[name].config.ts` |
| Prisma | `src/database/prisma/` |
| Mongoose | `src/database/mongoose/` |
| Shared modules (mail, queue) | `src/shared-modules/[name]/` |

---

## NAMING

```
Files:         kebab-case    → users.service.ts, create-user.dto.ts, jwt-auth.guard.ts
Classes:       PascalCase    → UsersService, CreateUserDto, JwtAuthGuard
Methods:       camelCase     → findAll, findByEmail, softDelete
Constants:     SCREAMING     → JWT_ACCESS_SECRET, RESPONSE_MESSAGE_KEY
Enums:         SCREAMING     → Role.ADMIN, Plan.PRO, Status.ACTIVE
DB tables:     snake_case    → @@map("refresh_tokens")
```

---

## NON-NEGOTIABLE RULES

- **Never** use `any` as a type
- **Never** use `req.body` directly — always DTOs
- **Never** return `passwordHash` in responses — use `@Exclude()`
- **Never** hardcode secrets — always `ConfigService`
- **Never** `new SomeService()` — always inject via DI
- **Never** `console.log` in code — use NestJS `Logger`
- **Always** use `async/await` — no `.then()` chains
- **Always** early return over nested if/else
- **Always** explicit return types on service and repository methods
- **Max** ~200 lines per file, ~30 lines per function — split if larger
- **MULTI_TENANT only** → never query tenant data without `tenantId` scope
- **B2C only** → never query user-owned data without `userId` scope

---

## RESPONSE ENVELOPE (every API)

```json
{ "success": true, "message": "...", "data": {}, "meta": {}, "timestamp": "" }
```
`ResponseTransformInterceptor` handles this automatically. Use `@ResponseMessage('...')` on controller methods.

---

## ERROR HANDLING

Services throw NestJS exceptions only:
```typescript
throw new NotFoundException('User not found');
throw new ConflictException('Email already in use');
throw new UnauthorizedException('Invalid credentials');
throw new ForbiddenException('Insufficient permissions');
```
Repositories return `null` — services decide what to throw.

---

## NEW MODULE CHECKLIST

```
□ Check PROJECT_TYPE before writing anything
□ nest g resource modules/[feature] --no-spec
□ Delete generated entities/ folder
□ Create [feature].repository.ts
□ Add repository to module providers[]
□ Add @ApiProperty() to all DTO fields
□ Add @ApiTags(), @ApiBearerAuth(), @ApiOperation() to controller
□ Add @ResponseMessage() to each controller method
□ Add Prisma model OR Mongoose schema
□ MULTI_TENANT: add tenantId to schema + all queries + controller params
□ B2C: add userId to schema + all queries + controller params
□ Run migration (Prisma) or verify indexes (Mongoose)
```
