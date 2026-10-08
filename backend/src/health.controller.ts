import { Controller, Get } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';

/**
 * Liveness probe for the host (Render polls this).
 * Deliberately touches nothing: no database, no external service. A health
 * check that queries Postgres would turn a brief database hiccup into a
 * restart loop, and would bill a query every few seconds forever.
 */
@Controller('health')
@SkipThrottle()
export class HealthController {
  @Get()
  check() {
    return { status: 'ok', uptime: Math.round(process.uptime()) };
  }
}
