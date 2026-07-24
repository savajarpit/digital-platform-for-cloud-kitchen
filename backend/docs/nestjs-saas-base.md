# NestJS SaaS Base Project — Complete Reference
> Senior-architect guide: project types, DB switching, Swagger/OpenAPI, and every best practice from the official NestJS docs.
> This is your reusable template. Keep it. Reference it on every new project.

---

## PART 0 — PROJECT TYPE SELECTION

**First decision on every new project — pick your type before writing any code.**
Everything else in this file works identically across all three types.
Only 4 things change: schema, repository queries, JWT payload, and TenantGuard.

---

### DECISION GUIDE — Which type is my project?

```
Are multiple companies/organizations sharing the same deployment?
  YES → MULTI_TENANT

Is this serving individual end users (not companies)?
  YES → B2C

Is this one app for one specific client or internal use?
  YES → SINGLE_TENANT
```

---

### TYPE 1 — MULTI_TENANT SaaS

**When to use:** Multiple companies use your app. Each company's data must be
completely isolated from others. One deployment, many tenants.

**Examples:** CRM software, billing platform, project management tool, HR system.

**Set this flag in `src/database/database.config.ts`:**
```typescript
export const PROJECT_TYPE = 'multi_tenant';
```

**What changes:**

#### Prisma schema — tenantId on every model
```prisma
model User {
  id        String   @id @default(uuid())
  email     String   @unique
  tenantId  String                          // ← required on every model
  role      Role     @default(USER)
  deletedAt DateTime?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  tenant    Tenant   @relation(fields: [tenantId], references: [id])

  @@index([tenantId])
  @@index([tenantId, role])                 // ← compound indexes
  @@map("users")
}

model Tenant {
  id        String   @id @default(uuid())
  name      String
  slug      String   @unique
  plan      Plan     @default(FREE)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  users     User[]
  @@map("tenants")
}
```

#### Mongoose schema — tenantId on every schema
```typescript
@Prop({ required: true, index: true })
tenantId: string;

UserSchema.index({ tenantId: 1, role: 1 });
```

#### Repository — always scope by tenantId
```typescript
// Every query MUST include tenantId
findAll(tenantId: string, skip: number, take: number) {
  return this.prisma.$transaction([
    this.prisma.user.findMany({ where: { tenantId, deletedAt: null }, skip, take }),
    this.prisma.user.count({ where: { tenantId, deletedAt: null } }),
  ]);
}
```

#### JWT payload — includes tenantId
```typescript
export interface JwtPayload {
  sub: string;       // userId
  email: string;
  role: string;
  tenantId: string;  // ← included
}
```

#### app.module.ts — TenantGuard active
```typescript
providers: [
  { provide: APP_GUARD, useClass: JwtAuthGuard },
  { provide: APP_GUARD, useClass: RolesGuard },
  { provide: APP_GUARD, useClass: TenantGuard },  // ← active
],
```

#### Controller — tenantId from @CurrentUser
```typescript
@Get()
findAll(
  @Query() pagination: OffsetPaginationDto,
  @CurrentUser('tenantId') tenantId: string,      // ← always extract
) {
  return this.usersService.findAll(pagination, tenantId);
}
```

---

### TYPE 2 — SINGLE_TENANT

**When to use:** One app, one client, one company. No data isolation needed
between organizations. Simple, no overhead.

**Examples:** Internal company tool, admin dashboard for one business,
client-specific custom app, MVP before going multi-tenant.

**Set this flag:**
```typescript
export const PROJECT_TYPE = 'single_tenant';
```

**What changes:**

#### Prisma schema — no tenantId, no Tenant model
```prisma
model User {
  id           String    @id @default(uuid())
  email        String    @unique
  passwordHash String
  role         Role      @default(USER)
  isActive     Boolean   @default(true)
  deletedAt    DateTime?
  createdAt    DateTime  @default(now())
  updatedAt    DateTime  @updatedAt

  // ← no tenantId, no tenant relation, no Tenant model
  @@index([email])
  @@index([role])
  @@map("users")
}
```

#### Repository — no tenant scope
```typescript
findAll(skip: number, take: number) {
  return this.prisma.$transaction([
    this.prisma.user.findMany({
      where: { deletedAt: null },    // ← no tenantId filter
      skip,
      take,
      orderBy: { createdAt: 'desc' },
    }),
    this.prisma.user.count({ where: { deletedAt: null } }),
  ]);
}
```

#### JWT payload — no tenantId
```typescript
export interface JwtPayload {
  sub: string;
  email: string;
  role: string;
  // ← no tenantId
}
```

#### app.module.ts — TenantGuard removed
```typescript
providers: [
  { provide: APP_GUARD, useClass: JwtAuthGuard },
  { provide: APP_GUARD, useClass: RolesGuard },
  // ← TenantGuard not registered
],
```

#### Controller — no tenantId param
```typescript
@Get()
findAll(@Query() pagination: OffsetPaginationDto) {
  return this.usersService.findAll(pagination);  // ← no tenantId
}
```

---

### TYPE 3 — B2C (Business to Consumer)

**When to use:** Individual users sign up and use the app for themselves.
No concept of organizations or tenants. Data is scoped by userId.

**Examples:** Social app, marketplace, consumer SaaS (like Notion personal,
Spotify, fitness tracker), any app where users own their own data.

**Set this flag:**
```typescript
export const PROJECT_TYPE = 'b2c';
```

**What changes:**

#### Prisma schema — userId scopes everything, no Tenant
```prisma
model User {
  id           String    @id @default(uuid())
  email        String    @unique
  passwordHash String
  username     String?   @unique
  role         Role      @default(USER)
  isActive     Boolean   @default(true)
  deletedAt    DateTime?
  createdAt    DateTime  @default(now())
  updatedAt    DateTime  @updatedAt

  posts        Post[]    // users own their own content
  @@index([email])
  @@map("users")
}

model Post {
  id        String    @id @default(uuid())
  userId    String                          // ← userId scopes data
  title     String
  content   String?
  deletedAt DateTime?
  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt

  user      User      @relation(fields: [userId], references: [id])
  @@index([userId])                         // ← index userId
  @@index([userId, createdAt])
  @@map("posts")
}
```

#### Repository — scope by userId instead of tenantId
```typescript
findAll(userId: string, skip: number, take: number) {
  return this.prisma.$transaction([
    this.prisma.post.findMany({
      where: { userId, deletedAt: null },   // ← userId not tenantId
      skip,
      take,
    }),
    this.prisma.post.count({ where: { userId, deletedAt: null } }),
  ]);
}
```

#### JWT payload — no tenantId
```typescript
export interface JwtPayload {
  sub: string;      // userId — this IS the scope
  email: string;
  role: string;
  // ← no tenantId
}
```

#### app.module.ts — TenantGuard replaced with OwnerGuard
```typescript
providers: [
  { provide: APP_GUARD, useClass: JwtAuthGuard },
  { provide: APP_GUARD, useClass: RolesGuard },
  { provide: APP_GUARD, useClass: OwnerGuard },  // ← users only access their own data
],
```

#### OwnerGuard — replaces TenantGuard
```typescript
// src/common/guards/owner.guard.ts
@Injectable()
export class OwnerGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();
    if (!req.user) return true;
    // Inject userId into request for easy access in services
    req.userId = req.user.userId;
    return true;
  }
}
```

#### Controller — userId from @CurrentUser
```typescript
@Get()
findAll(
  @Query() pagination: OffsetPaginationDto,
  @CurrentUser('userId') userId: string,      // ← userId not tenantId
) {
  return this.postsService.findAll(pagination, userId);
}
```

---

### WHAT NEVER CHANGES (all three types)

```
✅ Folder structure              identical
✅ Module pattern                identical
✅ Controller/Service/Repository identical
✅ Guards system                 identical (only which guards registered differs)
✅ JWT auth mechanism            identical
✅ Standard response format      identical
✅ Pagination system             identical
✅ Swagger/OpenAPI               identical
✅ Validation pipes              identical
✅ Exception filters             identical
✅ Redis patterns                identical
✅ Docker setup                  identical
✅ Queue system                  identical
✅ Logging                       identical
✅ Rate limiting                 identical
✅ DB switching (Prisma/Mongoose) identical
```

---

### QUICK COMPARISON TABLE

| Concern | Multi-tenant | Single-tenant | B2C |
|---|---|---|---|
| Data scope | tenantId | none | userId |
| Tenant model | ✅ Yes | ❌ No | ❌ No |
| TenantGuard | ✅ Active | ❌ Remove | ❌ Remove |
| OwnerGuard | ❌ No | ❌ No | ✅ Active |
| JWT tenantId | ✅ Yes | ❌ No | ❌ No |
| Repository filter | `{ tenantId }` | none | `{ userId }` |
| Compound indexes | `[tenantId, X]` | `[X]` | `[userId, X]` |
| Cross-data risk | High (isolation critical) | Low | Medium (users own data) |

---

## PART 1 — HOW TO SWITCH DATABASES PER PROJECT

### The golden rule
Your feature modules (auth, users, products...) never touch a DB driver.
They only talk to their Repository class.
The Repository is the only place that knows about Prisma or Mongoose.

```
Controller → Service → Repository → [Prisma OR Mongoose]
                                         ↑
                              Only this layer changes per project
```

### Step 1 — Pick your DB at project start (one-time decision)

Open `src/database/database.config.ts` and set:

```typescript
// src/database/database.config.ts
export const DB_DRIVER = 'prisma'; // 'prisma' | 'mongoose'
```

Then in `src/app.module.ts`, import the right database module:

```typescript
// src/app.module.ts
import { DB_DRIVER } from './database/database.config';
import { PrismaModule } from './database/prisma/prisma.module';
import { MongooseConfigModule } from './database/mongoose/mongoose.module';

@Module({
  imports: [
    // ✅ One line change — that's it
    DB_DRIVER === 'prisma' ? PrismaModule : MongooseConfigModule,

    // All feature modules stay exactly the same
    AuthModule,
    UsersModule,
  ],
})
export class AppModule {}
```

### Step 2 — Repository adapts to the chosen DB

Each feature has one repository file. You write the Prisma version OR the Mongoose version — not both. The service doesn't know which one it is.

```
modules/
  users/
    users.repository.ts   ← Write this for Prisma OR Mongoose
    users.service.ts      ← Never changes regardless of DB
    users.controller.ts   ← Never changes regardless of DB
```

---

## PART 2 — COMPLETE FOLDER STRUCTURE (with DB isolation)

```
src/
├── main.ts
├── app.module.ts
│
├── config/
│   ├── app.config.ts
│   ├── database.config.ts        ← DB_DRIVER setting lives here
│   ├── jwt.config.ts
│   ├── redis.config.ts
│   ├── throttle.config.ts
│   └── index.ts
│
├── database/
│   ├── database.config.ts        ← 'prisma' | 'mongoose'
│   │
│   ├── prisma/                   ← Use this for PostgreSQL projects
│   │   ├── prisma.module.ts
│   │   ├── prisma.service.ts
│   │   └── schema.prisma
│   │
│   └── mongoose/                 ← Use this for MongoDB projects
│       ├── mongoose.module.ts
│       └── mongoose.constants.ts
│
├── common/
│   ├── constants/
│   │   └── app.constants.ts
│   ├── decorators/
│   │   ├── api-paginated-response.decorator.ts  ← Swagger helper
│   │   ├── current-user.decorator.ts
│   │   ├── public.decorator.ts
│   │   ├── roles.decorator.ts
│   │   ├── response-message.decorator.ts
│   │   └── skip-throttle.decorator.ts
│   ├── dto/
│   │   ├── pagination.dto.ts
│   │   └── id-param.dto.ts
│   ├── enums/
│   │   ├── role.enum.ts
│   │   └── status.enum.ts
│   ├── filters/
│   │   └── all-exceptions.filter.ts
│   ├── guards/
│   │   ├── jwt-auth.guard.ts
│   │   ├── roles.guard.ts
│   │   └── tenant.guard.ts
│   ├── interceptors/
│   │   ├── response-transform.interceptor.ts
│   │   ├── logging.interceptor.ts
│   │   ├── timeout.interceptor.ts
│   │   └── serialize.interceptor.ts   ← Excludes password fields etc
│   ├── interfaces/
│   │   ├── api-response.interface.ts
│   │   ├── jwt-payload.interface.ts
│   │   └── paginated-result.interface.ts
│   ├── middleware/
│   │   └── request-id.middleware.ts   ← Adds X-Request-ID to every request
│   ├── pipes/
│   │   └── parse-uuid.pipe.ts
│   ├── repositories/
│   │   └── base.repository.ts         ← Abstract base — extend per module
│   ├── services/
│   │   └── pagination.service.ts
│   └── utils/
│       ├── hash.util.ts
│       ├── date.util.ts
│       └── crypto.util.ts
│
├── modules/
│   ├── auth/
│   │   ├── auth.module.ts
│   │   ├── auth.controller.ts
│   │   ├── auth.service.ts
│   │   ├── dto/
│   │   │   ├── login.dto.ts
│   │   │   ├── register.dto.ts
│   │   │   └── refresh-token.dto.ts
│   │   ├── strategies/
│   │   │   ├── jwt.strategy.ts
│   │   │   └── jwt-refresh.strategy.ts
│   │   └── types/
│   │       └── auth-tokens.type.ts
│   │
│   ├── users/
│   │   ├── users.module.ts
│   │   ├── users.controller.ts
│   │   ├── users.service.ts
│   │   ├── users.repository.ts    ← Only file that changes per DB
│   │   ├── dto/
│   │   │   ├── create-user.dto.ts
│   │   │   ├── update-user.dto.ts
│   │   │   └── user-response.dto.ts
│   │   └── schemas/               ← Only for Mongoose projects
│   │       └── user.schema.ts
│   │
│   └── health/                    ← Required for every project
│       ├── health.module.ts
│       └── health.controller.ts
│
└── shared-modules/
    ├── mail/
    ├── storage/
    ├── queue/
    └── cache/
```

---

## PART 3 — MAIN.TS (Complete, production-ready)

```typescript
// src/main.ts
import { NestFactory, Reflector } from '@nestjs/core';
import { AppModule } from './app.module';
import {
  ValidationPipe,
  VersioningType,
  ClassSerializerInterceptor,
  Logger,
} from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import helmet from 'helmet';
import compression from 'compression';
import { ResponseTransformInterceptor } from './common/interceptors/response-transform.interceptor';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { TimeoutInterceptor } from './common/interceptors/timeout.interceptor';
import { RequestIdMiddleware } from './common/middleware/request-id.middleware';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
  });

  const config = app.get(ConfigService);
  const port = config.get<number>('app.port', 3000);
  const isProduction = config.get('app.nodeEnv') === 'production';

  // ── 1. SECURITY HEADERS ─────────────────────────────────
  // helmet sets: X-DNS-Prefetch-Control, X-Frame-Options, 
  // X-Content-Type-Options, Referrer-Policy, and 7 more
  app.use(helmet({
    contentSecurityPolicy: isProduction ? undefined : false,
  }));

  // ── 2. CORS ──────────────────────────────────────────────
  // From: https://docs.nestjs.com/security/cors
  app.enableCors({
    origin: (origin, callback) => {
      const allowedOrigins = config.get<string[]>('app.allowedOrigins') || [];
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error(`CORS blocked: ${origin}`));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID', 'X-Tenant-ID'],
    exposedHeaders: ['X-Request-ID'],
  });

  // ── 3. COMPRESSION ───────────────────────────────────────
  // From: https://docs.nestjs.com/techniques/compression
  app.use(compression());

  // ── 4. REQUEST ID MIDDLEWARE ─────────────────────────────
  // Attach unique ID to every request for tracing
  app.use(RequestIdMiddleware);

  // ── 5. GLOBAL PREFIX & VERSIONING ───────────────────────
  // From: https://docs.nestjs.com/techniques/versioning
  app.setGlobalPrefix('api');
  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: '1',
    // prefix: 'v' → results in /api/v1/...
  });

  // ── 6. GLOBAL VALIDATION PIPE ───────────────────────────
  // From: https://docs.nestjs.com/techniques/validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,                // Strip unknown properties
      forbidNonWhitelisted: true,     // Throw error on unknown properties
      transform: true,                // Auto-convert types
      transformOptions: {
        enableImplicitConversion: true,
      },
      stopAtFirstError: false,        // Collect all errors, not just first
    }),
  );

  // ── 7. GLOBAL INTERCEPTORS ───────────────────────────────
  // From: https://docs.nestjs.com/interceptors
  const reflector = app.get(Reflector);
  app.useGlobalInterceptors(
    new LoggingInterceptor(),
    new TimeoutInterceptor(30_000),           // 30s global timeout
    new ClassSerializerInterceptor(reflector), // Respects @Exclude() in DTOs
    new ResponseTransformInterceptor(reflector),
  );

  // ── 8. GLOBAL EXCEPTION FILTER ──────────────────────────
  // From: https://docs.nestjs.com/exception-filters
  app.useGlobalFilters(new AllExceptionsFilter(config));

  // ── 9. GRACEFUL SHUTDOWN ─────────────────────────────────
  // From: https://docs.nestjs.com/fundamentals/lifecycle-events
  app.enableShutdownHooks();

  // ── 10. SWAGGER / OPENAPI ────────────────────────────────
  // From: https://docs.nestjs.com/openapi/introduction
  // Available at /api/docs (disable or auth-guard in production)
  if (!isProduction) {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('SaaS API')
      .setDescription(`
## Authentication
Use the **Authorize** button to set your Bearer token.
All protected endpoints require a valid JWT token.

## Versioning
Current version: **v1**. All endpoints prefixed with \`/api/v1/\`

## Response Format
All responses follow the standard envelope:
\`\`\`json
{ "success": true, "message": "...", "data": {...}, "meta": {...} }
\`\`\`
      `)
      .setVersion('1.0')
      .setContact('API Support', 'https://yourapp.com', 'api@yourapp.com')
      .setLicense('MIT', 'https://opensource.org/licenses/MIT')
      .addServer('http://localhost:3000', 'Local')
      .addServer('https://staging-api.yourapp.com', 'Staging')
      .addServer('https://api.yourapp.com', 'Production')
      .addBearerAuth(
        {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          name: 'Authorization',
          description: 'Enter your JWT access token',
          in: 'header',
        },
        'access-token', // ← reference name used in @ApiBearerAuth('access-token')
      )
      .addApiKey(
        { type: 'apiKey', in: 'header', name: 'X-API-Key' },
        'api-key',
      )
      .addTag('auth', 'Authentication & authorization')
      .addTag('users', 'User management')
      .addTag('health', 'Health checks')
      .build();

    const document = SwaggerModule.createDocument(app, swaggerConfig, {
      // deepScanRoutes helps pick up routes from lazy-loaded modules
      deepScanRoutes: true,
      // Collects all extra models not directly referenced in controllers
      extraModels: [],
    });

    SwaggerModule.setup('api/docs', app, document, {
      swaggerOptions: {
        persistAuthorization: true,     // Keeps JWT token on page refresh
        tagsSorter: 'alpha',            // Sort tags alphabetically
        operationsSorter: 'alpha',      // Sort endpoints alphabetically
        docExpansion: 'none',           // Collapse all by default
        filter: true,                   // Add search box
        showRequestDuration: true,      // Show request timing
        tryItOutEnabled: true,          // Enable "Try it out" by default
      },
      customSiteTitle: 'SaaS API Docs',
      // Optionally serve JSON spec at /api/docs-json
    });

    logger.log(`📚 Swagger UI: http://localhost:${port}/api/docs`);
    logger.log(`📄 Swagger JSON: http://localhost:${port}/api/docs-json`);
  }

  await app.listen(port);
  logger.log(`🚀 Application running on: http://localhost:${port}/api/v1`);
}

bootstrap();
```

---

## PART 4 — SWAGGER BEST PRACTICES (Per DTO and Controller)

### DTO with full Swagger decorators

```typescript
// src/modules/users/dto/create-user.dto.ts
import {
  IsEmail, IsString, MinLength, MaxLength,
  IsOptional, IsEnum, IsStrongPassword,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { Role } from '../../../common/enums/role.enum';

export class CreateUserDto {
  @ApiProperty({
    example: 'john@example.com',
    description: 'Unique email address of the user',
    format: 'email',
  })
  @IsEmail({}, { message: 'Must be a valid email' })
  @Transform(({ value }) => value?.toLowerCase().trim())
  email: string;

  @ApiProperty({
    example: 'MyP@ssw0rd!',
    description: 'At least 8 chars, 1 uppercase, 1 number, 1 symbol',
    minLength: 8,
  })
  @IsStrongPassword({
    minLength: 8,
    minUppercase: 1,
    minNumbers: 1,
    minSymbols: 1,
  })
  password: string;

  @ApiProperty({ example: 'John', minLength: 2, maxLength: 50 })
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  firstName: string;

  @ApiPropertyOptional({ example: 'Doe' })
  @IsOptional()
  @IsString()
  lastName?: string;

  @ApiPropertyOptional({ enum: Role, default: Role.USER })
  @IsOptional()
  @IsEnum(Role)
  role?: Role = Role.USER;
}
```

### Response DTO with @Exclude() for sensitive fields

```typescript
// src/modules/users/dto/user-response.dto.ts
import { Exclude, Expose } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

// From: https://docs.nestjs.com/techniques/serialization
// Works with ClassSerializerInterceptor in main.ts
export class UserResponseDto {
  @ApiProperty({ example: 'uuid-here' })
  @Expose()
  id: string;

  @ApiProperty({ example: 'john@example.com' })
  @Expose()
  email: string;

  @ApiProperty({ example: 'John' })
  @Expose()
  firstName: string;

  @ApiProperty({ example: 'USER' })
  @Expose()
  role: string;

  @ApiProperty()
  @Expose()
  createdAt: Date;

  // ✅ Never sent to client — ClassSerializerInterceptor strips this
  @Exclude()
  passwordHash: string;

  @Exclude()
  deletedAt: Date;

  constructor(partial: Partial<UserResponseDto>) {
    Object.assign(this, partial);
  }
}
```

### Mapped Types — avoid repeating DTO fields

```typescript
// From: https://docs.nestjs.com/openapi/mapped-types
import { PartialType, OmitType, PickType, IntersectionType } from '@nestjs/swagger';
import { CreateUserDto } from './create-user.dto';

// UpdateUserDto = all CreateUserDto fields but optional
export class UpdateUserDto extends PartialType(CreateUserDto) {}

// LoginDto = only email + password from CreateUserDto
export class LoginDto extends PickType(CreateUserDto, ['email', 'password'] as const) {}

// AdminCreateUserDto = CreateUserDto without the role restriction
export class AdminCreateUserDto extends OmitType(CreateUserDto, ['role'] as const) {}
```

### Controller with full Swagger decorators

```typescript
// src/modules/users/users.controller.ts
import {
  Controller, Get, Post, Patch, Delete, Body,
  Param, Query, HttpCode, HttpStatus, UseGuards,
} from '@nestjs/common';
import {
  ApiTags, ApiBearerAuth, ApiOperation, ApiResponse,
  ApiParam, ApiQuery, ApiNotFoundResponse,
  ApiUnauthorizedResponse, ApiForbiddenResponse,
  ApiConflictResponse, ApiBadRequestResponse,
} from '@nestjs/swagger';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserResponseDto } from './dto/user-response.dto';
import { OffsetPaginationDto } from '../../common/dto/pagination.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ResponseMessage } from '../../common/decorators/response-message.decorator';
import { ApiPaginatedResponse } from '../../common/decorators/api-paginated-response.decorator';
import { Role } from '../../common/enums/role.enum';

@ApiTags('users')
@ApiBearerAuth('access-token')       // Links to the 'access-token' scheme in main.ts
@ApiUnauthorizedResponse({ description: 'Missing or invalid JWT token' })
@ApiForbiddenResponse({ description: 'Insufficient role permissions' })
@Controller({ path: 'users', version: '1' })
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @Roles(Role.ADMIN)
  @ResponseMessage('User created successfully')
  @ApiOperation({
    summary: 'Create a new user',
    description: 'Admin only. Creates a user within the current tenant.',
  })
  @ApiResponse({ status: 201, description: 'User created', type: UserResponseDto })
  @ApiConflictResponse({ description: 'Email already in use' })
  @ApiBadRequestResponse({ description: 'Validation failed' })
  create(@Body() dto: CreateUserDto, @CurrentUser('tenantId') tenantId: string) {
    return this.usersService.create(dto, tenantId);
  }

  @Get()
  @ApiOperation({ summary: 'List all users (paginated)' })
  @ApiPaginatedResponse(UserResponseDto)     // Custom decorator — see below
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 20 })
  findAll(
    @Query() pagination: OffsetPaginationDto,
    @CurrentUser('tenantId') tenantId: string,
  ) {
    return this.usersService.findAll(pagination, tenantId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get user by ID' })
  @ApiParam({ name: 'id', type: String, description: 'User UUID' })
  @ApiResponse({ status: 200, type: UserResponseDto })
  @ApiNotFoundResponse({ description: 'User not found' })
  findOne(@Param('id') id: string) {
    return this.usersService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update user by ID' })
  @ApiResponse({ status: 200, type: UserResponseDto })
  update(@Param('id') id: string, @Body() dto: UpdateUserDto) {
    return this.usersService.update(id, dto);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Soft delete user' })
  @ApiResponse({ status: 204, description: 'User deleted' })
  remove(@Param('id') id: string) {
    return this.usersService.remove(id);
  }
}
```

### Custom Swagger decorator for paginated responses

```typescript
// src/common/decorators/api-paginated-response.decorator.ts
import { applyDecorators, Type } from '@nestjs/common';
import { ApiExtraModels, ApiOkResponse, getSchemaPath } from '@nestjs/swagger';

export function ApiPaginatedResponse<TModel extends Type<any>>(model: TModel) {
  return applyDecorators(
    ApiExtraModels(model),
    ApiOkResponse({
      description: 'Paginated list',
      schema: {
        allOf: [
          {
            properties: {
              success: { type: 'boolean', example: true },
              message: { type: 'string', example: 'Success' },
              data: {
                type: 'array',
                items: { $ref: getSchemaPath(model) },
              },
              meta: {
                type: 'object',
                properties: {
                  total: { type: 'number', example: 100 },
                  page: { type: 'number', example: 1 },
                  limit: { type: 'number', example: 20 },
                  totalPages: { type: 'number', example: 5 },
                  hasNext: { type: 'boolean', example: true },
                  hasPrev: { type: 'boolean', example: false },
                },
              },
            },
          },
        ],
      },
    }),
  );
}
```

---

## PART 5 — SERIALIZATION (Exclude sensitive fields globally)

```typescript
// src/common/interceptors/serialize.interceptor.ts
// From: https://docs.nestjs.com/techniques/serialization
// This works in conjunction with ClassSerializerInterceptor in main.ts

// Usage in controllers:
// @SerializeResponse(UserResponseDto)
// This forces the response to be serialized through UserResponseDto

import { UseInterceptors, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { plainToClass } from 'class-transformer';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

interface ClassConstructor { new(...args: any[]): {} }

export function Serialize(dto: ClassConstructor) {
  return UseInterceptors(new SerializeInterceptor(dto));
}

export class SerializeInterceptor implements NestInterceptor {
  constructor(private dto: any) {}
  intercept(context: ExecutionContext, handler: CallHandler): Observable<any> {
    return handler.handle().pipe(
      map((data) =>
        plainToClass(this.dto, data, { excludeExtraneousValues: true }),
      ),
    );
  }
}
```

---

## PART 6 — LOGGING (NestJS built-in + structured)

```typescript
// src/common/interceptors/logging.interceptor.ts
// From: https://docs.nestjs.com/techniques/logger
import {
  Injectable, NestInterceptor, ExecutionContext,
  CallHandler, Logger,
} from '@nestjs/common';
import { Observable, throwError } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { Request, Response } from 'express';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const req: Request = context.switchToHttp().getRequest();
    const { method, url, ip } = req;
    const requestId = req.headers['x-request-id'];
    const start = Date.now();

    return next.handle().pipe(
      tap(() => {
        const res: Response = context.switchToHttp().getResponse();
        const duration = Date.now() - start;
        this.logger.log(
          `${method} ${url} ${res.statusCode} — ${duration}ms [${requestId}] ${ip}`,
        );
      }),
      catchError((error) => {
        const duration = Date.now() - start;
        this.logger.error(
          `${method} ${url} ERROR — ${duration}ms [${requestId}]`,
          error.stack,
        );
        return throwError(() => error);
      }),
    );
  }
}
```

---

## PART 7 — REQUEST ID MIDDLEWARE

```typescript
// src/common/middleware/request-id.middleware.ts
import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';

// Attaches a unique ID to every request.
// Frontend can use X-Request-ID to report bugs ("request ID: abc-123 failed")
export function RequestIdMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const requestId = (req.headers['x-request-id'] as string) || uuidv4();
  req.headers['x-request-id'] = requestId;
  res.setHeader('X-Request-ID', requestId); // Echo it back
  next();
}
```

---

## PART 8 — TIMEOUT INTERCEPTOR

```typescript
// src/common/interceptors/timeout.interceptor.ts
// From: https://docs.nestjs.com/interceptors
import {
  Injectable, NestInterceptor, ExecutionContext,
  CallHandler, RequestTimeoutException,
} from '@nestjs/common';
import { Observable, throwError, TimeoutError } from 'rxjs';
import { catchError, timeout } from 'rxjs/operators';

@Injectable()
export class TimeoutInterceptor implements NestInterceptor {
  constructor(private readonly timeoutMs: number = 30_000) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(
      timeout(this.timeoutMs),
      catchError((err) => {
        if (err instanceof TimeoutError) {
          return throwError(() => new RequestTimeoutException('Request timed out'));
        }
        return throwError(() => err);
      }),
    );
  }
}
```

---

## PART 9 — CACHING (Redis)

```typescript
// From: https://docs.nestjs.com/techniques/caching
// npm i @nestjs/cache-manager cache-manager cache-manager-redis-store ioredis

// src/shared-modules/cache/cache.module.ts
import { Module } from '@nestjs/common';
import { CacheModule } from '@nestjs/cache-manager';
import { ConfigService } from '@nestjs/config';
import { redisStore } from 'cache-manager-redis-store';

@Module({
  imports: [
    CacheModule.registerAsync({
      isGlobal: true,
      useFactory: async (config: ConfigService) => ({
        store: redisStore,
        host: config.get('redis.host'),
        port: config.get('redis.port'),
        ttl: 300, // 5 minutes default
      }),
      inject: [ConfigService],
    }),
  ],
})
export class CacheConfigModule {}

// Usage in any service:
import { Cache } from 'cache-manager';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject } from '@nestjs/common';

@Injectable()
export class UsersService {
  constructor(@Inject(CACHE_MANAGER) private cacheManager: Cache) {}

  async findOne(id: string) {
    const cacheKey = `user:${id}`;
    const cached = await this.cacheManager.get(cacheKey);
    if (cached) return cached;

    const user = await this.usersRepo.findById(id);
    await this.cacheManager.set(cacheKey, user, 300); // cache 5 mins
    return user;
  }

  async update(id: string, dto: UpdateUserDto) {
    const user = await this.usersRepo.update(id, dto);
    await this.cacheManager.del(`user:${id}`); // invalidate cache on update
    return user;
  }
}
```

---

## PART 10 — HEALTH CHECKS

```typescript
// From: https://docs.nestjs.com/recipes/terminus
// npm i @nestjs/terminus @nestjs/axios

// src/modules/health/health.module.ts
import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { HttpModule } from '@nestjs/axios';
import { HealthController } from './health.controller';
import { PrismaHealthIndicator } from './indicators/prisma.health';

@Module({
  imports: [TerminusModule, HttpModule],
  controllers: [HealthController],
  providers: [PrismaHealthIndicator],
})
export class HealthModule {}

// src/modules/health/health.controller.ts
import { Controller, Get } from '@nestjs/common';
import {
  HealthCheck, HealthCheckService, MemoryHealthIndicator,
  DiskHealthIndicator,
} from '@nestjs/terminus';
import { Public } from '../../common/decorators/public.decorator';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { PrismaHealthIndicator } from './indicators/prisma.health';

@ApiTags('health')
@Controller({ path: 'health', version: '1' })
export class HealthController {
  constructor(
    private health: HealthCheckService,
    private memory: MemoryHealthIndicator,
    private disk: DiskHealthIndicator,
    private prismaHealth: PrismaHealthIndicator,
  ) {}

  @Public()
  @Get()
  @HealthCheck()
  @ApiOperation({ summary: 'Health check endpoint (used by load balancers)' })
  check() {
    return this.health.check([
      () => this.prismaHealth.isHealthy('database'),
      () => this.memory.checkHeap('memory_heap', 512 * 1024 * 1024), // 512MB
      () => this.disk.checkStorage('storage', {
        path: '/',
        thresholdPercent: 0.9, // Alert when 90% full
      }),
    ]);
  }

  @Public()
  @Get('ping')
  @ApiOperation({ summary: 'Simple ping — confirms app is alive' })
  ping() {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }
}

// src/modules/health/indicators/prisma.health.ts
import { Injectable } from '@nestjs/common';
import { HealthIndicator, HealthIndicatorResult, HealthCheckError } from '@nestjs/terminus';
import { PrismaService } from '../../../database/prisma/prisma.service';

@Injectable()
export class PrismaHealthIndicator extends HealthIndicator {
  constructor(private readonly prisma: PrismaService) { super(); }

  async isHealthy(key: string): Promise<HealthIndicatorResult> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return this.getStatus(key, true);
    } catch (error) {
      throw new HealthCheckError('Database check failed', this.getStatus(key, false));
    }
  }
}
```

---

## PART 11 — TASK SCHEDULING (Cron Jobs)

```typescript
// From: https://docs.nestjs.com/techniques/task-scheduling
// npm i @nestjs/schedule

// In app.module.ts:
import { ScheduleModule } from '@nestjs/schedule';
ScheduleModule.forRoot(), // add to imports

// src/shared-modules/scheduler/tasks.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression, Interval, Timeout } from '@nestjs/schedule';

@Injectable()
export class TasksService {
  private readonly logger = new Logger(TasksService.name);

  // Runs every day at midnight
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async cleanExpiredTokens() {
    this.logger.log('Cleaning expired refresh tokens...');
    // await this.prisma.refreshToken.deleteMany({ where: { expiresAt: { lt: new Date() } } });
  }

  // Runs every 5 minutes
  @Interval(5 * 60 * 1000)
  async syncExternalData() {
    this.logger.debug('Syncing external data...');
  }

  // Runs once 10 seconds after app start
  @Timeout(10_000)
  async warmupCache() {
    this.logger.log('Warming up cache...');
  }
}
```

---

## PART 12 — QUEUES (Background Jobs)

```typescript
// From: https://docs.nestjs.com/techniques/queues
// npm i @nestjs/bull bull ioredis @types/bull

// src/shared-modules/queue/queue.module.ts
import { BullModule } from '@nestjs/bull';
import { ConfigService } from '@nestjs/config';

BullModule.forRootAsync({
  useFactory: (config: ConfigService) => ({
    redis: {
      host: config.get('redis.host'),
      port: config.get('redis.port'),
    },
  }),
  inject: [ConfigService],
}),

// Register a specific queue
BullModule.registerQueue({ name: 'mail' }),
BullModule.registerQueue({ name: 'export' }),

// src/shared-modules/queue/processors/mail.processor.ts
import { Process, Processor } from '@nestjs/bull';
import { Job } from 'bull';
import { Logger } from '@nestjs/common';

@Processor('mail')
export class MailProcessor {
  private readonly logger = new Logger(MailProcessor.name);

  @Process('send-welcome')
  async sendWelcome(job: Job<{ email: string; name: string }>) {
    this.logger.log(`Sending welcome email to ${job.data.email}`);
    // await this.mailService.sendWelcome(job.data);
  }

  @Process('send-reset-password')
  async sendResetPassword(job: Job<{ email: string; token: string }>) {
    // await this.mailService.sendResetPassword(job.data);
  }
}

// Adding a job from a service:
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';

@Injectable()
export class AuthService {
  constructor(@InjectQueue('mail') private mailQueue: Queue) {}

  async register(dto: RegisterDto) {
    const user = await this.usersRepo.create(dto);
    // Fire and forget — doesn't block the response
    await this.mailQueue.add('send-welcome', {
      email: user.email,
      name: user.firstName,
    }, {
      attempts: 3,          // Retry 3 times on failure
      backoff: 5000,        // Wait 5s between retries
      removeOnComplete: true,
    });
    return user;
  }
}
```

---

## PART 13 — EVENTS (Internal pub/sub)

```typescript
// From: https://docs.nestjs.com/techniques/events
// npm i @nestjs/event-emitter

// app.module.ts: EventEmitterModule.forRoot()

// Define events as classes (type safety)
// src/common/events/user-created.event.ts
export class UserCreatedEvent {
  constructor(
    public readonly userId: string,
    public readonly email: string,
    public readonly tenantId: string,
  ) {}
}

// Emit from service
import { EventEmitter2 } from '@nestjs/event-emitter';

@Injectable()
export class UsersService {
  constructor(private eventEmitter: EventEmitter2) {}

  async create(dto: CreateUserDto) {
    const user = await this.usersRepo.create(dto);
    this.eventEmitter.emit('user.created', new UserCreatedEvent(
      user.id, user.email, user.tenantId,
    ));
    return user;
  }
}

// Listen in any module (decoupled!)
import { OnEvent } from '@nestjs/event-emitter';

@Injectable()
export class NotificationListener {
  @OnEvent('user.created', { async: true })
  async handleUserCreated(event: UserCreatedEvent) {
    // Send welcome email, create default settings, etc.
  }
}
```

---

## PART 14 — VALIDATION EXTRAS

```typescript
// From: https://docs.nestjs.com/techniques/validation

// Custom validator example — check if value is unique in DB
import {
  ValidatorConstraint, ValidatorConstraintInterface,
  ValidationArguments, registerDecorator, ValidationOptions,
} from 'class-validator';

@ValidatorConstraint({ name: 'IsUnique', async: true })
@Injectable()
export class IsUniqueConstraint implements ValidatorConstraintInterface {
  constructor(private prisma: PrismaService) {}

  async validate(value: any, args: ValidationArguments) {
    const [model, field] = args.constraints;
    const record = await (this.prisma as any)[model].findUnique({
      where: { [field]: value },
    });
    return !record; // true = valid (value is unique)
  }

  defaultMessage(args: ValidationArguments) {
    return `${args.property} already exists`;
  }
}

export function IsUnique(model: string, field: string, options?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName,
      options,
      constraints: [model, field],
      validator: IsUniqueConstraint,
    });
  };
}

// Use in DTO:
@IsUnique('user', 'email')
email: string;
```

---

## PART 15 — CSRF PROTECTION (for cookie-based auth)

```typescript
// From: https://docs.nestjs.com/security/csrf
// Only needed if you use cookie sessions instead of JWT headers
// npm i csurf cookie-parser

// main.ts additions (if using cookies):
import * as cookieParser from 'cookie-parser';
import * as csurf from 'csurf';

app.use(cookieParser());
app.use(csurf({ cookie: true }));

// Add a CSRF token endpoint:
@Get('csrf-token')
@Public()
getCsrfToken(@Req() req: Request) {
  return { csrfToken: req.csrfToken() };
}
```

---

## PART 16 — PRISMA vs MONGOOSE REPOSITORY SIDE BY SIDE

```typescript
// ════════════════════════════════════════════════════════
// PRISMA VERSION (PostgreSQL)
// src/modules/users/users.repository.ts
// ════════════════════════════════════════════════════════
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma/prisma.service';
import { User, Prisma } from '@prisma/client';
import { OffsetPaginationDto } from '../../common/dto/pagination.dto';

@Injectable()
export class UsersRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { id, deletedAt: null } });
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { email, deletedAt: null } });
  }

  async findAll(tenantId: string, pagination: OffsetPaginationDto) {
    const { page, limit } = pagination;
    const skip = (page - 1) * limit;
    return this.prisma.$transaction([
      this.prisma.user.findMany({
        where: { tenantId, deletedAt: null },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.user.count({ where: { tenantId, deletedAt: null } }),
    ]);
  }

  async create(data: Prisma.UserCreateInput): Promise<User> {
    return this.prisma.user.create({ data });
  }

  async update(id: string, data: Prisma.UserUpdateInput): Promise<User> {
    return this.prisma.user.update({ where: { id }, data });
  }

  async softDelete(id: string): Promise<User> {
    return this.prisma.user.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}


// ════════════════════════════════════════════════════════
// MONGOOSE VERSION (MongoDB) — same interface, different internals
// src/modules/users/users.repository.ts
// ════════════════════════════════════════════════════════
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User } from './schemas/user.schema';
import { CreateUserDto } from './dto/create-user.dto';
import { OffsetPaginationDto } from '../../common/dto/pagination.dto';

@Injectable()
export class UsersRepository {
  constructor(@InjectModel(User.name) private userModel: Model<User>) {}

  async findById(id: string): Promise<User | null> {
    return this.userModel.findOne({ _id: id, deletedAt: null }).lean();
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.userModel.findOne({ email, deletedAt: null }).lean();
  }

  async findAll(tenantId: string, pagination: OffsetPaginationDto) {
    const { page, limit } = pagination;
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.userModel
        .find({ tenantId, deletedAt: null })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      this.userModel.countDocuments({ tenantId, deletedAt: null }),
    ]);
    return [data, total];
  }

  async create(data: Partial<User>): Promise<User> {
    return this.userModel.create(data);
  }

  async update(id: string, data: Partial<User>): Promise<User | null> {
    return this.userModel.findByIdAndUpdate(id, data, { new: true }).lean();
  }

  async softDelete(id: string): Promise<User | null> {
    return this.userModel.findByIdAndUpdate(
      id,
      { deletedAt: new Date() },
      { new: true },
    ).lean();
  }
}
```

**The UsersService is 100% identical for both databases.**
Only the repository changes. That is the point of this architecture.

---

## PART 17 — ENV VALIDATION (Zod or Joi)

```typescript
// src/config/env.validation.ts
// From: https://docs.nestjs.com/techniques/configuration#schema-validation
import Joi from 'joi';

export const validationSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test')
    .default('development'),
  PORT: Joi.number().default(3000),

  // Database — one of these required depending on DB_DRIVER
  DATABASE_URL: Joi.string().when('DB_DRIVER', {
    is: 'prisma',
    then: Joi.required(),
  }),
  MONGO_URI: Joi.string().when('DB_DRIVER', {
    is: 'mongoose',
    then: Joi.required(),
  }),

  // JWT — both secrets required, enforce minimum length
  JWT_ACCESS_SECRET: Joi.string().min(32).required(),
  JWT_REFRESH_SECRET: Joi.string().min(32).required(),
  JWT_ACCESS_EXPIRY: Joi.string().default('15m'),
  JWT_REFRESH_EXPIRY: Joi.string().default('7d'),

  // Redis
  REDIS_HOST: Joi.string().default('localhost'),
  REDIS_PORT: Joi.number().default(6379),

  // CORS
  ALLOWED_ORIGINS: Joi.string().default('http://localhost:3000'),
});
```

---

## PART 18 — PACKAGE.JSON SCRIPTS

```json
{
  "scripts": {
    "build": "nest build",
    "start": "nest start",
    "start:dev": "nest start --watch",
    "start:debug": "nest start --debug --watch",
    "start:prod": "node dist/main",
    "lint": "eslint \"{src,apps,libs,test}/**/*.ts\" --fix",
    "format": "prettier --write \"src/**/*.ts\"",
    "test": "jest",
    "test:watch": "jest --watch",
    "test:cov": "jest --coverage",
    "test:e2e": "jest --config ./test/jest-e2e.json",
    "db:migrate": "prisma migrate dev",
    "db:migrate:prod": "prisma migrate deploy",
    "db:seed": "ts-node prisma/seed.ts",
    "db:studio": "prisma studio",
    "db:generate": "prisma generate",
    "db:reset": "prisma migrate reset"
  }
}
```

---

## PART 19 — COMPLETE INSTALL COMMANDS (per DB choice)

### Common for ALL projects
```bash
npm i @nestjs/common @nestjs/core @nestjs/platform-express reflect-metadata rxjs
npm i @nestjs/config @nestjs/jwt @nestjs/passport @nestjs/swagger
npm i passport passport-jwt passport-local
npm i class-validator class-transformer
npm i helmet compression uuid
npm i @nestjs/throttler
npm i @nestjs/terminus @nestjs/axios    # health checks
npm i @nestjs/schedule                  # cron jobs
npm i @nestjs/event-emitter             # events
npm i @nestjs/bull bull ioredis         # queues
npm i cache-manager @nestjs/cache-manager cache-manager-redis-store
npm i bcryptjs
npm i @types/passport-jwt @types/bcryptjs @types/compression -D
npm i @types/uuid -D
```

### PostgreSQL + Prisma
```bash
npm i @prisma/client
npm i prisma -D
npx prisma init --datasource-provider postgresql
```

### MongoDB + Mongoose
```bash
npm i @nestjs/mongoose mongoose
```

---

## PART 20 — DECISION CHECKLIST (per new project)

```
□ 1. Choose DB: prisma OR mongoose
□ 2. Set DB_DRIVER in src/database/database.config.ts
□ 3. Import correct DB module in app.module.ts
□ 4. Write schema.prisma OR mongoose schemas for your models
□ 5. Write repositories using Prisma OR Mongoose API
□ 6. Set env variables in .env (copy from .env.example)
□ 7. Run migrations (prisma) OR ensure indexes (mongoose)
□ 8. Everything else (guards, interceptors, swagger, auth) stays the same
```

---

*This document was generated as a reusable reference.
Keep it in your project wiki or Notion so AI tools and new team members
can follow the same patterns consistently.*
