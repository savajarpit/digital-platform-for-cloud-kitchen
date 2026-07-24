---
name: nestjs
description: >
  Read for any NestJS task: modules, controllers, services, guards,
  interceptors, decorators, Swagger, versioning, or any file inside src/.
  Read general-guidelines.md first, then this.
  Official docs: https://docs.nestjs.com/
---

# NestJS Skill

## PROJECT DECISIONS (already made — do not change)

```
Global prefix:     /api
Versioning:        URI-based → /api/v1/, /api/v2/
Auth:              JWT global guard — all routes protected by default
Public routes:     @Public() decorator to opt out
Response:          ResponseTransformInterceptor wraps everything
Validation:        whitelist: true, forbidNonWhitelisted: true, transform: true
Serialization:     ClassSerializerInterceptor global — @Exclude() works automatically
Rate limiting:     ThrottlerGuard global
DB switch:         DB_DRIVER in src/database/database.config.ts
```

---

## MODULE SKELETON

```typescript
@Module({
  imports: [PrismaModule],               // or MongooseModule.forFeature([...])
  controllers: [FeatureController],
  providers: [FeatureService, FeatureRepository],
  exports: [FeatureService],             // only if other modules need it
})
export class FeatureModule {}
```

---

## CONTROLLER SKELETON

```typescript
@ApiTags('feature')
@ApiBearerAuth('access-token')
@ApiUnauthorizedResponse({ description: 'Missing or invalid JWT' })
@ApiForbiddenResponse({ description: 'Insufficient permissions' })
@Controller({ path: 'feature', version: '1' })
export class FeatureController {
  constructor(private readonly featureService: FeatureService) {}

  @Post()
  @Roles(Role.ADMIN)
  @ResponseMessage('Created successfully')
  @ApiOperation({ summary: 'Create resource' })
  @ApiResponse({ status: 201, type: FeatureResponseDto })
  create(@Body() dto: CreateFeatureDto, @CurrentUser('tenantId') tenantId: string) {
    return this.featureService.create(dto, tenantId);
  }

  @Get()
  @ApiPaginatedResponse(FeatureResponseDto)
  findAll(@Query() pagination: OffsetPaginationDto, @CurrentUser('tenantId') tenantId: string) {
    return this.featureService.findAll(pagination, tenantId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get by ID' })
  @ApiResponse({ status: 200, type: FeatureResponseDto })
  @ApiNotFoundResponse({ description: 'Not found' })
  findOne(@Param('id') id: string) {
    return this.featureService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateFeatureDto) {
    return this.featureService.update(id, dto);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string) {
    return this.featureService.remove(id);
  }
}
```

---

## SERVICE SKELETON

```typescript
@Injectable()
export class FeatureService {
  constructor(
    private readonly repo: FeatureRepository,
    private readonly pagination: PaginationService,
  ) {}

  async create(dto: CreateFeatureDto, tenantId: string): Promise<Feature> {
    const exists = await this.repo.findByField(dto.field);
    if (exists) throw new ConflictException('Already exists');
    return this.repo.create({ ...dto, tenantId });
  }

  async findAll(dto: OffsetPaginationDto, tenantId: string) {
    const skip = this.pagination.getOffsetSkip(dto.page, dto.limit);
    const [data, total] = await this.repo.findAll(tenantId, skip, dto.limit);
    return { data, meta: this.pagination.buildOffsetMeta(total, dto.page, dto.limit) };
  }

  async findOne(id: string): Promise<Feature> {
    const item = await this.repo.findById(id);
    if (!item) throw new NotFoundException('Not found');
    return item;
  }

  async update(id: string, dto: UpdateFeatureDto): Promise<Feature> {
    await this.findOne(id);
    return this.repo.update(id, dto);
  }

  async remove(id: string): Promise<void> {
    await this.findOne(id);
    await this.repo.softDelete(id);
  }
}
```

---

## DTO SKELETON

```typescript
export class CreateFeatureDto {
  @ApiProperty({ example: 'value' })
  @IsString()
  @MinLength(2)
  @Transform(({ value }) => value?.trim())
  name: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;
}

// Always use @nestjs/swagger mapped types (NOT @nestjs/mapped-types)
export class UpdateFeatureDto extends PartialType(CreateFeatureDto) {}
export class LoginDto extends PickType(CreateFeatureDto, ['name'] as const) {}

// Response DTO — always exclude sensitive fields
export class FeatureResponseDto {
  @Expose() id: string;
  @Expose() name: string;
  @Exclude() sensitiveField: string;   // never sent to client
  constructor(partial: Partial<FeatureResponseDto>) { Object.assign(this, partial); }
}
```

---

## GUARDS (registered globally in app.module.ts)

```typescript
// Execution order:
// JwtAuthGuard → RolesGuard → TenantGuard

providers: [
  { provide: APP_GUARD, useClass: JwtAuthGuard },   // 1st — populates req.user
  { provide: APP_GUARD, useClass: RolesGuard },      // 2nd — checks @Roles()
  { provide: APP_GUARD, useClass: TenantGuard },     // 3rd — enforces tenantId
],

// Usage in controllers:
@Public()                              // bypasses JwtAuthGuard
@Roles(Role.ADMIN)                     // requires ADMIN role
@SkipThrottle()                        // bypasses rate limiting (health only)
@CurrentUser()                         // gets full user from req.user
@CurrentUser('tenantId')               // gets single field from req.user
```

---

## SWAGGER — REQUIRED ON EVERY ENDPOINT

```typescript
// Controller level (always):
@ApiTags('resource-name')
@ApiBearerAuth('access-token')

// Method level (always):
@ApiOperation({ summary: 'Short title' })
@ApiResponse({ status: 200, type: ResponseDto })
@ApiNotFoundResponse({ description: 'Not found' })

// DTO level (every field):
@ApiProperty({ example: 'john@example.com' })
@ApiPropertyOptional({ example: 'optional value' })

// Pagination response (use custom decorator):
@ApiPaginatedResponse(ResponseDto)

// Mapped types — MUST import from @nestjs/swagger
import { PartialType, PickType, OmitType } from '@nestjs/swagger';
```

---

## VERSIONING

```typescript
// Controller at specific version
@Controller({ path: 'users', version: '1' })    // → /api/v1/users

// Breaking change → new controller, never modify v1
@Controller({ path: 'users', version: '2' })    // → /api/v2/users

// Single endpoint at all versions
@Version(VERSION_NEUTRAL)
```

---

## RATE LIMITING

```typescript
// Stricter on auth endpoints
@Throttle({ short: { limit: 5, ttl: 60_000 } })
@Post('login')

// Skip on health check only
@SkipThrottle()
@Get('health')
```

---

## KEY DOCS LINKS

```
Modules:          https://docs.nestjs.com/modules
Guards:           https://docs.nestjs.com/guards
Interceptors:     https://docs.nestjs.com/interceptors
Validation:       https://docs.nestjs.com/techniques/validation
Serialization:    https://docs.nestjs.com/techniques/serialization
Versioning:       https://docs.nestjs.com/techniques/versioning
OpenAPI:          https://docs.nestjs.com/openapi/introduction
OpenAPI types:    https://docs.nestjs.com/openapi/mapped-types
Rate limiting:    https://docs.nestjs.com/security/rate-limiting
Request lifecycle:https://docs.nestjs.com/faq/request-lifecycle
```