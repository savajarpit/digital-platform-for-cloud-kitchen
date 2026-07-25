import { ResolvedTenant } from '../services/tenant-resolver.service';
import { Role } from '../enums/role.enum';

declare global {
  namespace Express {
    interface User {
      userId: string;
      email: string;
      role: Role;
      tenantId?: string;
    }

    interface Request {
      tenantContext?: ResolvedTenant;
      tenantId?: string;
    }
  }
}

export {};
