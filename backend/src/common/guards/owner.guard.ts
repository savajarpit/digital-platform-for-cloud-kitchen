import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';

@Injectable()
export class OwnerGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();
    if (!req.user) return true;
    req.userId = req.user.userId;
    return true;
  }
}
