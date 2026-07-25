import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Request } from 'express';
import { ResolvedTenant } from '../services/tenant-resolver.service';

export const CurrentTenant = createParamDecorator(
  (data: keyof ResolvedTenant | undefined, ctx: ExecutionContext) => {
    const req = ctx.switchToHttp().getRequest<Request>();
    const tenant = req.tenantContext;
    return data ? tenant?.[data] : tenant;
  },
);
