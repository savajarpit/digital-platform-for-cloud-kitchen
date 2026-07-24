---
name: prisma
description: >
  Read for any Prisma task: schema changes, migrations, queries, relations,
  transactions, seeding, or PrismaService.
  Use when DB_DRIVER = 'prisma' in src/database/database.config.ts.
  Read general-guidelines.md → nestjs.md → this file.
  Official docs: https://www.prisma.io/docs
  NestJS guide:  https://www.prisma.io/docs/guides/nestjs
---

# Prisma Skill

## PROJECT-SPECIFIC DECISIONS

```
Schema location:   src/database/prisma/schema.prisma
Migrations:        src/database/prisma/migrations/
Generated client:  src/generated/prisma            ← NOT node_modules/@prisma/client
Import path:       import { ... } from '../../generated/prisma'
PrismaService:     @Global() — available everywhere, never import PrismaModule in features
Driver:            PrismaPg adapter (latest Prisma v6+ pattern)
IDs:               uuid() always — never autoincrement()
Soft delete:       deletedAt DateTime? on every tenant model
Tenant scope:      tenantId required on every query for tenant data
```

---

## SCHEMA RULES

```prisma
// ✅ Always
@id @default(uuid())           // uuid IDs
@@map("snake_case_name")       // explicit table names
createdAt DateTime @default(now())
updatedAt DateTime @updatedAt
deletedAt DateTime?            // soft delete
tenantId  String               // on every tenant-scoped model
@@index([tenantId])            // index every FK
@@index([tenantId, role])      // compound for multi-column filters

// ❌ Never
@id @default(autoincrement())  // exposes scale
// missing @@map()             // defaults to PascalCase table name
// missing tenantId index
```

---

## PRISMASERVICE

```typescript
// src/database/prisma/prisma.service.ts
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor(private config: ConfigService) {
    const adapter = new PrismaPg({ connectionString: config.get('database.url') });
    super({ adapter });
  }
  async onModuleInit() { await this.$connect(); }
  async onModuleDestroy() { await this.$disconnect(); }
  async ping() { return this.$queryRaw`SELECT 1`; }
}

// prisma.module.ts
@Global()
@Module({ providers: [PrismaService], exports: [PrismaService] })
export class PrismaModule {}
```

---

## REPOSITORY PATTERNS

```typescript
// Always scope by tenantId + deletedAt
findAll(tenantId: string, skip: number, take: number) {
  return this.prisma.$transaction([
    this.prisma.user.findMany({
      where: { tenantId, deletedAt: null },
      select: { id: true, email: true, firstName: true, role: true, createdAt: true },
      skip, take,
      orderBy: { createdAt: 'desc' },
    }),
    this.prisma.user.count({ where: { tenantId, deletedAt: null } }),
  ]);
}

// Soft delete — always preferred
softDelete(id: string) {
  return this.prisma.user.update({ where: { id }, data: { deletedAt: new Date() } });
}

// Transaction — multi-step operations
async transfer(fromId: string, toId: string, amount: number) {
  return this.prisma.$transaction(async (tx) => {
    const from = await tx.wallet.update({ where: { id: fromId }, data: { balance: { decrement: amount } } });
    if (from.balance < 0) throw new Error('Insufficient');
    return tx.wallet.update({ where: { id: toId }, data: { balance: { increment: amount } } });
  });
}

// Cursor pagination
async findWithCursor(tenantId: string, cursor?: string, take = 20) {
  const results = await this.prisma.user.findMany({
    where: { tenantId, deletedAt: null },
    take: take + 1,
    ...(cursor && { cursor: { id: cursor }, skip: 1 }),
    orderBy: { createdAt: 'desc' },
  });
  const hasNext = results.length > take;
  const data = hasNext ? results.slice(0, take) : results;
  return { data, nextCursor: hasNext ? data[data.length - 1].id : null };
}

// Always use Prisma-generated types
async create(data: Prisma.UserCreateInput): Promise<User> {}
async update(id: string, data: Prisma.UserUpdateInput): Promise<User> {}
```

---

## MIGRATION COMMANDS

```bash
npx prisma migrate dev --name add_users_table      # dev — creates + runs SQL
npx prisma migrate deploy                          # prod — runs pending only
npx prisma migrate status                          # check status
npx prisma generate                                # regenerate client after schema change
npx prisma studio                                  # GUI browser
npx prisma migrate reset                           # dev only — DESTROYS DATA

# Rules:
# ✅ Descriptive --name always
# ✅ Commit migration SQL files to git
# ✅ migrate deploy in CI/CD before app starts
# ❌ Never db push in production
# ❌ Never edit a migration file after it ran
```

---

## INDEXING RULES

```prisma
@@index([tenantId])                    // every FK column
@@index([email])                       // every WHERE column
@@index([tenantId, role])              // compound for multi-column filters
@@index([tenantId, createdAt])         // sorted paginated lists
@@index([deletedAt])                   // soft-delete filtering
@@index([expiresAt])                   // for cleanup cron jobs
```

---

## COMMON MISTAKES

```typescript
// ❌ Wrong import
import { PrismaClient } from '@prisma/client';
// ✅ Correct
import { PrismaClient } from '../../generated/prisma';

// ❌ Missing tenant scope
this.prisma.user.findMany();
// ✅
this.prisma.user.findMany({ where: { tenantId, deletedAt: null } });

// ❌ Select all columns
this.prisma.user.findMany({ where: { tenantId } });
// ✅ Always select only needed fields
this.prisma.user.findMany({ where: { tenantId }, select: { id: true, email: true } });
```

---

## KEY DOCS LINKS

```
NestJS guide:    https://www.prisma.io/docs/guides/nestjs
Schema ref:      https://www.prisma.io/docs/orm/reference/prisma-schema-reference
Client API:      https://www.prisma.io/docs/orm/reference/prisma-client-reference
Migrations:      https://www.prisma.io/docs/orm/prisma-migrate
Transactions:    https://www.prisma.io/docs/orm/prisma-client/queries/transactions
Pagination:      https://www.prisma.io/docs/orm/prisma-client/queries/pagination
Indexes:         https://www.prisma.io/docs/orm/prisma-schema/data-model/indexes
Best practices:  https://www.prisma.io/docs/orm/more/best-practices
NestJS recipe:   https://docs.nestjs.com/recipes/prisma
```