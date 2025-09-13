import { Module } from '@nestjs/common';
import { CallService } from './services/call.service';
import { CallController } from './call.controller';
import { PaymentService } from '../../externals/payments.service';
import { HttpClientModule } from '../../externals/http/http.module';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthModule } from '../auth/auth.module';
import { RoomService } from './services/room.service';
import { SequelizeRoomRepository } from './infrastructure/room.repository';
import { SequelizeModule } from '@nestjs/sequelize';
import { RoomModel } from './models/room.model';
import { RoomUserModel } from './models/room-user.model';
import { SequelizeRoomUserRepository } from './infrastructure/room-user.repository';
import { CallUseCase } from './call.usecase';
import { AvatarService } from '../../externals/avatar/avatar.service';
import { SharedModule } from '../../shared/shared.module';
import { JitsiWebhookService } from './webhooks/jitsi/jitsi-webhook.service';
import { JitsiWebhookController } from './webhooks/jitsi/jitsi-webhook.controller';

@Module({
  controllers: [CallController, JitsiWebhookController],
  providers: [
    CallService,
    PaymentService,
    ConfigService,
    RoomService,
    SequelizeRoomRepository,
    SequelizeRoomUserRepository,
    CallUseCase,
    AvatarService,
    JitsiWebhookService,
  ],
  imports: [
    HttpClientModule,
    ConfigModule,
    AuthModule,
    SharedModule,
    SequelizeModule.forFeature([RoomModel, RoomUserModel]),
  ],
})
export class CallModule {}
