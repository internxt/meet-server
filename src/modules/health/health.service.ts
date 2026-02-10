import { Injectable, Logger } from '@nestjs/common';
import { Sequelize } from 'sequelize-typescript';
import { AvatarService } from '../../externals/avatar/avatar.service';

@Injectable()
export class HealthService {
  private readonly logger = new Logger(HealthService.name);

  constructor(
    private readonly sequelize: Sequelize, 
    private readonly avatarService: AvatarService
  ) {}

  async check() {
    const uptime = process.uptime();
    const timestamp = new Date().toISOString();

    const payload: { status: string, uptime: number, timestamp: string } = {
      status: 'ok',
      uptime,
      timestamp,
    };

    const checks: Array<Promise<any>> = [];
    const checkNames: string[] = [];

    checkNames.push('db');
    const dbPromise = (async () => {
        const start = Date.now();
        await this.sequelize.authenticate();
        return { status: 'ok', ping: Date.now() - start };
    })();
    checks.push(dbPromise);

    checkNames.push('s3');
    checks.push(this.avatarService.checkBucket());

    const results = await Promise.allSettled(checks);

    results.forEach((r, idx) => {
      const name = checkNames[idx];
      if (r.status === 'fulfilled') {
        payload[name] = r.value;
        if (r.value?.status !== 'ok' && payload.status === 'ok') {
          payload.status = 'degraded';
        }
      } else {
        payload[name] = { status: 'error', error: r.reason?.message || String(r.reason) };
        if (payload.status === 'ok') payload.status = 'degraded';
      }
    });

    this.logger.debug(`Health check performed: ${JSON.stringify(payload)}`);
    return payload;
  }
}
