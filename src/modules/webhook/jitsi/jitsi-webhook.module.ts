import { Module } from '@nestjs/common';
import { JitsiWebhookController } from './jitsi-webhook.controller';
import { JitsiWebhookService } from './jitsi-webhook.service';
import { ConfigModule } from '@nestjs/config';
import { HttpClientModule } from '../../../externals/http/http.module';
import { RoomModule } from '../../room/room.module';

@Module({
  imports: [ConfigModule, HttpClientModule, RoomModule],
  controllers: [JitsiWebhookController],
  providers: [JitsiWebhookService],
  exports: [JitsiWebhookService],
})
export class JitsiWebhookModule {}
