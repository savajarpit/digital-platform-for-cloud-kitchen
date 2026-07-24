---
name: mongoose
description: >
  Read for any Mongoose task: schema design, models, hooks, indexes,
  queries, virtuals, or transactions.
  Use when DB_DRIVER = 'mongoose' in src/database/database.config.ts.
  Read general-guidelines.md → nestjs.md → this file.
  Official docs: https://mongoosejs.com/docs/
  TypeScript:    https://mongoosejs.com/docs/typescript.html
  NestJS docs:   https://docs.nestjs.com/techniques/mongodb
---

# Mongoose Skill

## PROJECT-SPECIFIC DECISIONS

```
Schema location:   src/modules/[feature]/schemas/[feature].schema.ts
Module setup:      src/database/mongoose/mongoose.module.ts
Style:             @Schema() + @Prop() decorators — NOT raw new mongoose.Schema()
TypeScript:        Interface per schema — Schema<IModel> generic
IDs:               MongoDB default _id (ObjectId) — convert to string with .toString()
Soft delete:       deletedAt: Date — pre(/^find/) middleware auto-excludes
Tenant scope:      tenantId required in every query
Passwords:         select: false on passwordHash — excluded from all queries by default
Reads:             Always .lean() for read queries — never for save/validate
Timestamps:        { timestamps: true } in schema options — auto createdAt/updatedAt
versionKey:        false always — removes __v
```

---

## SCHEMA SKELETON

```typescript
// src/modules/users/schemas/user.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export interface IUser {
  email: string;
  passwordHash: string;
  firstName: string;
  role: string;
  tenantId: string;
  isActive: boolean;
  deletedAt?: Date;
}

@Schema({
  timestamps: true,
  collection: 'users',      // always explicit, snake_case
  versionKey: false,        // removes __v
  toJSON: {
    virtuals: true,
    transform: (_, ret) => {
      ret.id = ret._id.toString();
      delete ret._id;
      delete ret.passwordHash;    // never in JSON output
    },
  },
})
export class User extends Document implements IUser {
  @Prop({ required: true, unique: true, lowercase: true, trim: true, index: true })
  email: string;

  @Prop({ required: true, select: false })   // excluded from all queries by default
  passwordHash: string;

  @Prop({ required: true, trim: true })
  firstName: string;

  @Prop({ type: String, enum: ['SUPER_ADMIN', 'ADMIN', 'USER', 'GUEST'], default: 'USER', index: true })
  role: string;

  @Prop({ required: true, index: true })
  tenantId: string;

  @Prop({ default: true })
  isActive: boolean;

  @Prop({ default: null, index: true })
  deletedAt?: Date;
}

export const UserSchema = SchemaFactory.createForClass(User);

// Compound indexes — always AFTER SchemaFactory.createForClass()
UserSchema.index({ tenantId: 1, role: 1 });
UserSchema.index({ tenantId: 1, status: 1 });
UserSchema.index({ tenantId: 1, createdAt: -1 });

// Auto-exclude soft-deleted from ALL find queries
UserSchema.pre(/^find/, function (next) {
  (this as any).where({ deletedAt: null });
  next();
});
```

---

## REGISTER IN MODULE

```typescript
@Module({
  imports: [
    MongooseModule.forFeature([{ name: User.name, schema: UserSchema }]),
  ],
  controllers: [UsersController],
  providers: [UsersService, UsersRepository],
  exports: [UsersService],
})
export class UsersModule {}
```

---

## REPOSITORY PATTERNS

```typescript
@Injectable()
export class UsersRepository {
  constructor(@InjectModel(User.name) private userModel: Model<User>) {}

  // Always .lean() for reads
  findById(id: string): Promise<User | null> {
    return this.userModel.findOne({ _id: id, deletedAt: null }).lean();
  }

  // Select: false field needs explicit +field to include
  findByEmailWithPassword(email: string): Promise<User | null> {
    return this.userModel.findOne({ email }).select('+passwordHash').lean();
  }

  findAll(tenantId: string, skip: number, take: number): Promise<[User[], number]> {
    return Promise.all([
      this.userModel.find({ tenantId, deletedAt: null }).sort({ createdAt: -1 }).skip(skip).limit(take).lean(),
      this.userModel.countDocuments({ tenantId, deletedAt: null }),
    ]);
  }

  create(data: Partial<User>): Promise<User> {
    return this.userModel.create(data);
  }

  // Always { new: true } to return updated document
  update(id: string, data: Partial<User>): Promise<User | null> {
    return this.userModel.findOneAndUpdate({ _id: id, deletedAt: null }, { $set: data }, { new: true }).lean();
  }

  softDelete(id: string): Promise<User | null> {
    return this.userModel.findOneAndUpdate(
      { _id: id, deletedAt: null },
      { $set: { deletedAt: new Date(), isActive: false } },
      { new: true },
    ).lean();
  }

  // Cursor pagination
  async findWithCursor(tenantId: string, cursor?: string, take = 20) {
    const filter: any = { tenantId, deletedAt: null };
    if (cursor) filter._id = { $lt: cursor };
    const results = await this.userModel.find(filter).sort({ _id: -1 }).limit(take + 1).lean();
    const hasNext = results.length > take;
    const data = hasNext ? results.slice(0, take) : results;
    return { data, nextCursor: hasNext ? String(data[data.length - 1]._id) : null };
  }
}
```

---

## HOOKS (middleware)

```typescript
// Pre-save: normalize data
UserSchema.pre('save', function (next) {
  if (this.email) this.email = this.email.toLowerCase().trim();
  next();
});

// Pre-find: auto-exclude soft deleted (already in skeleton above)
UserSchema.pre(/^find/, function (next) {
  (this as any).where({ deletedAt: null });
  next();
});

// TTL index — auto-expire documents (tokens, OTPs, sessions)
RefreshTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
```

---

## INDEXING RULES

```typescript
// Single field — inline on @Prop
@Prop({ index: true })          // regular index
@Prop({ unique: true })         // unique index

// Compound — after SchemaFactory, always
UserSchema.index({ tenantId: 1, role: 1 });
UserSchema.index({ tenantId: 1, createdAt: -1 });      // sorted lists
UserSchema.index({ email: 1, tenantId: 1 }, { unique: true });

// Sparse — only indexes documents where field exists
UserSchema.index({ deletedAt: 1 }, { sparse: true });

// TTL — auto-delete expired documents
Schema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Text search
UserSchema.index({ firstName: 'text', lastName: 'text' });
```

---

## TRANSACTIONS

```typescript
// Requires MongoDB replica set or Atlas
constructor(@InjectConnection() private connection: Connection) {}

async transfer() {
  const session = await this.connection.startSession();
  session.startTransaction();
  try {
    await this.model.updateOne({...}, {...}, { session });
    await this.model.updateOne({...}, {...}, { session });
    await session.commitTransaction();
  } catch (e) {
    await session.abortTransaction();
    throw e;
  } finally {
    session.endSession();
  }
}
```

---

## COMMON MISTAKES

```typescript
// ❌ Not using .lean()
this.userModel.find({ tenantId })
// ✅
this.userModel.find({ tenantId }).lean()

// ❌ Forgetting select:false on passwordHash
@Prop({ required: true })
passwordHash: string;
// ✅
@Prop({ required: true, select: false })

// ❌ Raw Mongoose syntax in NestJS project
const schema = new mongoose.Schema({ name: String });
// ✅ Always use decorators
export const UserSchema = SchemaFactory.createForClass(User);

// ❌ _id as ObjectId when string needed
const id = user._id;
// ✅
const id = user._id.toString();

// ❌ Missing { new: true } on findOneAndUpdate
this.userModel.findOneAndUpdate(filter, data)
// ✅ returns updated document
this.userModel.findOneAndUpdate(filter, data, { new: true })
```

---

## KEY DOCS LINKS

```
Schemas:         https://mongoosejs.com/docs/guide.html
SchemaTypes:     https://mongoosejs.com/docs/schematypes.html
Middleware:      https://mongoosejs.com/docs/middleware.html
Queries:         https://mongoosejs.com/docs/queries.html
TypeScript:      https://mongoosejs.com/docs/typescript.html
Validation:      https://mongoosejs.com/docs/validation.html
Populate:        https://mongoosejs.com/docs/populate.html
Transactions:    https://mongoosejs.com/docs/transactions.html
Indexes:         https://mongoosejs.com/docs/guide.html#indexes
Timestamps:      https://mongoosejs.com/docs/timestamps.html
NestJS MongoDB:  https://docs.nestjs.com/techniques/mongodb
NestJS recipe:   https://docs.nestjs.com/recipes/mongodb
```