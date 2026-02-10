import { Injectable, Logger } from '@nestjs/common';
import { Sequelize } from 'sequelize-typescript';
import { AvatarService } from '../../externals/avatar/avatar.service';

type CheckResult = { status: 'ok' | 'error' | 'unknown'; ping?: number; error?: string };
type HealthPayload = {
  status: 'ok' | 'degraded';
  uptime: number;
  timestamp: string;
  db?: CheckResult;
  s3?: CheckResult;
};

@Injectable()
export class HealthService {
  private readonly logger = new Logger(HealthService.name);

  constructor(
    private readonly sequelize: Sequelize,
    private readonly avatarService: AvatarService,
  ) {}

  private async checkDb(): Promise<CheckResult> {
    const start = Date.now();
    await this.sequelize.authenticate();
    return { status: 'ok', ping: Date.now() - start };
  }

  async check(): Promise<HealthPayload> {
    const payload: HealthPayload = {
      status: 'ok',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    };

    const checks = {
      db: this.checkDb(),
      s3: this.avatarService.checkBucket(),
    } as const;

    const results = await Promise.allSettled(
      Object.entries(checks).map(async ([name, promise]) => {
        const value = await promise;
        return [name, value] as const;
      }),
    );

    for (const r of results) {
      if (r.status === 'fulfilled') {
        const [name, value] = r.value;
        payload[name] = value;
        if (value.status !== 'ok') payload.status = 'degraded';
      } else {
        payload.status = 'degraded';
      }
    }

    this.logger.debug(`Health check performed: ${JSON.stringify(payload)}`);
    return payload;
  }
}
