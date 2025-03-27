import { Module } from '@nestjs/common';
import { CallService } from './call.service';
import { CallController } from './call.controller';
import { PaymentService } from 'src/externals/payments.service';
import { HttpClientModule } from 'src/externals/http/http.module';
import { ConfigModule, ConfigService } from '@nestjs/config';

@Module({
  controllers: [CallController],
  providers: [CallService, PaymentService, ConfigService],
  imports: [HttpClientModule, ConfigModule],
})
export class CallModule {}
