import { Module } from '@nestjs/common';
import { JitsiWebhookModule } from './jitsi/jitsi-webhook.module';

@Module({
  imports: [JitsiWebhookModule],
  exports: [JitsiWebhookModule],
})
export class WebhookModule {}
