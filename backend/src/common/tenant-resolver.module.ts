import { Global, Module } from '@nestjs/common';
import { TenantResolverService } from './services/tenant-resolver.service';

@Global()
@Module({
  providers: [TenantResolverService],
  exports: [TenantResolverService],
})
export class TenantResolverModule {}
