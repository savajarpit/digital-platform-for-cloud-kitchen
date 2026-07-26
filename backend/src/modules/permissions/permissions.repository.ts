import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma/prisma.service';
import { Permission, Role, RolePermission } from '../../generated/prisma';

export type RolePermissionWithKey = RolePermission & { permission: Permission };

@Injectable()
export class PermissionsRepository {
  constructor(private readonly prisma: PrismaService) {}

  findAllPermissions(): Promise<Permission[]> {
    return this.prisma.permission.findMany({ orderBy: { category: 'asc' } });
  }

  findGrantedForRole(
    tenantId: string,
    role: Role,
  ): Promise<RolePermissionWithKey[]> {
    return this.prisma.rolePermission.findMany({
      where: { tenantId, role, granted: true },
      include: { permission: true },
    });
  }

  findAllForTenantRole(
    tenantId: string,
    role: Role,
  ): Promise<RolePermissionWithKey[]> {
    return this.prisma.rolePermission.findMany({
      where: { tenantId, role },
      include: { permission: true },
    });
  }

  findPermissionByKey(key: string): Promise<Permission | null> {
    return this.prisma.permission.findUnique({ where: { key } });
  }

  upsertGrant(
    tenantId: string,
    role: Role,
    permissionId: string,
    granted: boolean,
  ): Promise<RolePermission> {
    return this.prisma.rolePermission.upsert({
      where: { tenantId_role_permissionId: { tenantId, role, permissionId } },
      update: { granted },
      create: { tenantId, role, permissionId, granted },
    });
  }
}
