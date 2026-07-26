import { Injectable, NotFoundException } from '@nestjs/common';
import { PermissionsRepository } from './permissions.repository';
import { RedisService } from '../../shared-modules/cache/redis.service';
import { Role } from '../../generated/prisma';
import { PERMISSION_CATALOG } from '../../common/enums/permission.enum';

const CACHE_TTL_SECONDS = 3600;

export interface MyPermissions {
  role: Role;
  isSuperAdmin: boolean;
  permissions: string[];
}

export interface PermissionGrantView {
  key: string;
  description: string;
  category: string;
  granted: boolean;
}

@Injectable()
export class PermissionsService {
  constructor(
    private readonly permissionsRepo: PermissionsRepository,
    private readonly redis: RedisService,
  ) {}

  async getMyPermissions(
    role: Role,
    tenantId: string | undefined,
  ): Promise<MyPermissions> {
    if (role === Role.SUPER_ADMIN) {
      return {
        role,
        isSuperAdmin: true,
        permissions: PERMISSION_CATALOG.map((p) => p.key),
      };
    }
    const permissions = tenantId
      ? await this.getGrantedKeys(tenantId, role)
      : [];
    return { role, isSuperAdmin: false, permissions };
  }

  async hasPermission(
    tenantId: string,
    role: Role,
    key: string,
  ): Promise<boolean> {
    const granted = await this.getGrantedKeys(tenantId, role);
    return granted.includes(key);
  }

  private async getGrantedKeys(
    tenantId: string,
    role: Role,
  ): Promise<string[]> {
    const cacheKey = this.cacheKey(tenantId, role);
    const cached = await this.redis.get<string[]>(cacheKey);
    if (cached) return cached;

    const rows = await this.permissionsRepo.findGrantedForRole(tenantId, role);
    const keys = rows.map((row) => row.permission.key);
    await this.redis.set(cacheKey, keys, CACHE_TTL_SECONDS);
    return keys;
  }

  /** Full catalog for this tenant/role, each entry marked granted or not — for an admin UI to render toggles against. */
  async getRoleGrantView(
    tenantId: string,
    role: Role,
  ): Promise<PermissionGrantView[]> {
    const [catalog, grants] = await Promise.all([
      this.permissionsRepo.findAllPermissions(),
      this.permissionsRepo.findAllForTenantRole(tenantId, role),
    ]);
    const grantedByKey = new Map(
      grants.map((g) => [g.permission.key, g.granted]),
    );
    return catalog.map((permission) => ({
      key: permission.key,
      description: permission.description,
      category: permission.category,
      granted: grantedByKey.get(permission.key) ?? false,
    }));
  }

  async setGrant(
    tenantId: string,
    role: Role,
    permissionKey: string,
    granted: boolean,
  ): Promise<PermissionGrantView> {
    const permission =
      await this.permissionsRepo.findPermissionByKey(permissionKey);
    if (!permission) throw new NotFoundException('Unknown permission key');

    await this.permissionsRepo.upsertGrant(
      tenantId,
      role,
      permission.id,
      granted,
    );
    await this.redis.del(this.cacheKey(tenantId, role));

    return {
      key: permission.key,
      description: permission.description,
      category: permission.category,
      granted,
    };
  }

  private cacheKey(tenantId: string, role: Role): string {
    return `permissions:${tenantId}:${role}`;
  }
}
