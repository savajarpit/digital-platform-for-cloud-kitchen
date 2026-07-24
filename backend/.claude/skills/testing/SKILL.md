---
name: testing
description: >
  Read for any testing task: unit tests, e2e tests, mocking services
  or repositories, test structure, or Jest setup.
  Read general-guidelines.md → nestjs.md → this file.
  NestJS testing: https://docs.nestjs.com/fundamentals/testing
---

# Testing Skill

## PROJECT DECISIONS

```
Framework:    Jest (built into NestJS)
Unit tests:   [feature].service.spec.ts — mock all dependencies
e2e tests:    test/[feature].e2e-spec.ts — real HTTP requests, test DB
Location:     Unit tests co-located with source file
              e2e tests in test/ folder at root
Coverage:     Services and guards — minimum, controllers — optional
Mock style:   jest.fn() for simple, createMock() for complex
```

---

## UNIT TEST — SERVICE SKELETON

```typescript
// src/modules/users/users.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { UsersService } from './users.service';
import { UsersRepository } from './users.repository';
import { PaginationService } from '../../common/services/pagination.service';
import { NotFoundException, ConflictException } from '@nestjs/common';

// Mock the repository — services should never need a real DB in unit tests
const mockUsersRepository = {
  findById:    jest.fn(),
  findByEmail: jest.fn(),
  findAll:     jest.fn(),
  create:      jest.fn(),
  update:      jest.fn(),
  softDelete:  jest.fn(),
};

const mockPaginationService = {
  getOffsetSkip:    jest.fn().mockReturnValue(0),
  buildOffsetMeta:  jest.fn().mockReturnValue({ total: 0, page: 1, limit: 20 }),
};

describe('UsersService', () => {
  let service: UsersService;
  let repo: typeof mockUsersRepository;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: UsersRepository,   useValue: mockUsersRepository },
        { provide: PaginationService, useValue: mockPaginationService },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    repo = mockUsersRepository;
  });

  afterEach(() => jest.clearAllMocks()); // reset mocks between tests

  describe('findOne', () => {
    it('returns user when found', async () => {
      const mockUser = { id: '1', email: 'test@test.com' };
      repo.findById.mockResolvedValue(mockUser);
      const result = await service.findOne('1');
      expect(result).toEqual(mockUser);
      expect(repo.findById).toHaveBeenCalledWith('1');
    });

    it('throws NotFoundException when user not found', async () => {
      repo.findById.mockResolvedValue(null);
      await expect(service.findOne('999')).rejects.toThrow(NotFoundException);
    });
  });

  describe('create', () => {
    it('throws ConflictException when email exists', async () => {
      repo.findByEmail.mockResolvedValue({ id: '1', email: 'taken@test.com' });
      await expect(
        service.create({ email: 'taken@test.com', password: 'pass' } as any, 'tenant1'),
      ).rejects.toThrow(ConflictException);
    });

    it('creates user when email is available', async () => {
      repo.findByEmail.mockResolvedValue(null);
      repo.create.mockResolvedValue({ id: '1', email: 'new@test.com' });
      const result = await service.create(
        { email: 'new@test.com', password: 'Pass@1234' } as any,
        'tenant1',
      );
      expect(result).toBeDefined();
      expect(repo.create).toHaveBeenCalled();
    });
  });
});
```

---

## E2E TEST SKELETON

```typescript
// test/auth.e2e-spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

describe('Auth (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [AppModule],                        // real app with test DB
    }).compile();

    app = module.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /api/v1/auth/register', () => {
    it('registers successfully', () => {
      return request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({ email: 'test@test.com', password: 'Test@12345', firstName: 'Test' })
        .expect(201)
        .expect((res) => {
          expect(res.body.success).toBe(true);
          expect(res.body.data.accessToken).toBeDefined();
        });
    });

    it('rejects duplicate email', () => {
      return request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({ email: 'test@test.com', password: 'Test@12345', firstName: 'Test' })
        .expect(409);  // ConflictException
    });

    it('rejects invalid email', () => {
      return request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({ email: 'not-an-email', password: 'Test@12345', firstName: 'Test' })
        .expect(400);  // ValidationPipe
    });
  });

  describe('POST /api/v1/auth/login', () => {
    it('returns tokens on valid credentials', () => {
      return request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: 'test@test.com', password: 'Test@12345' })
        .expect(200)
        .expect((res) => {
          expect(res.body.data.accessToken).toBeDefined();
          expect(res.body.data.refreshToken).toBeDefined();
        });
    });

    it('rejects wrong password', () => {
      return request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: 'test@test.com', password: 'WrongPass' })
        .expect(401);
    });
  });
});
```

---

## GUARD TESTING

```typescript
// Test that routes are actually protected
it('returns 401 without JWT', () => {
  return request(app.getHttpServer())
    .get('/api/v1/users')
    .expect(401);
});

it('returns 403 with wrong role', () => {
  return request(app.getHttpServer())
    .delete('/api/v1/users/some-id')
    .set('Authorization', `Bearer ${userToken}`)  // USER role, not ADMIN
    .expect(403);
});
```

---

## JEST CONFIG (package.json)

```json
{
  "jest": {
    "moduleFileExtensions": ["js", "json", "ts"],
    "rootDir": "src",
    "testRegex": ".*\\.spec\\.ts$",
    "transform": { "^.+\\.(t|j)s$": "ts-jest" },
    "collectCoverageFrom": ["**/*.(t|j)s"],
    "coverageDirectory": "../coverage",
    "testEnvironment": "node"
  }
}
```

```bash
npm run test              # unit tests
npm run test:watch        # watch mode
npm run test:cov          # with coverage
npm run test:e2e          # e2e tests
```

---

## RULES

```
✅ Mock all dependencies in unit tests — no real DB calls
✅ afterEach(() => jest.clearAllMocks()) — always reset between tests
✅ Test happy path + error paths for every service method
✅ e2e tests use real app + real test DB (separate DB from dev)
✅ Test that guards actually block unauthorized requests
✅ Test ValidationPipe rejects invalid input

❌ Never call real services in unit tests — always mock
❌ Never share state between tests
❌ Never test implementation details — test behavior (what, not how)
```

---

## KEY DOCS

```
NestJS testing:     https://docs.nestjs.com/fundamentals/testing
Jest docs:          https://jestjs.io/docs/getting-started
Supertest:          https://github.com/ladjs/supertest
```