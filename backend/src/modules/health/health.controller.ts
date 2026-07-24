import { Controller, Get } from '@nestjs/common';
import {
  HealthCheck,
  HealthCheckService,
  MemoryHealthIndicator,
  DiskHealthIndicator,
} from '@nestjs/terminus';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Public } from '../../common/decorators/public.decorator';
import { SkipThrottle } from '../../common/decorators/skip-throttle.decorator';
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
  @SkipThrottle()
  @Get()
  @HealthCheck()
  @ApiOperation({ summary: 'Full health check' })
  check() {
    return this.health.check([
      () => this.prismaHealth.isHealthy('database'),
      () => this.memory.checkHeap('memory_heap', 512 * 1024 * 1024),
      () =>
        this.disk.checkStorage('storage', {
          path: process.platform === 'win32' ? 'E:\\' : '/',
          thresholdPercent: 0.9,
        }),
    ]);
  }
  @Public()
  @SkipThrottle()
  @Get('ping')
  @ApiOperation({ summary: 'Simple ping' })
  ping() {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }
}
