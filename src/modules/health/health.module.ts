import { Module } from '@nestjs/common';
import { HealthController } from './health.controller';
import { HealthService } from './health.service';
import { AvatarService } from '../../externals/avatar/avatar.service';

@Module({
  controllers: [HealthController],
  providers: [HealthService, AvatarService],
  exports: [HealthService],
})
export class HealthModule {}
