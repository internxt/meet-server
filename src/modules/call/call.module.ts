import { Module } from '@nestjs/common';
import { CallService } from './call.service';
import { CallController } from './call.controller';
import { PaymentService } from '../../externals/payments.service';
import { HttpClientModule } from '../../externals/http/http.module';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthModule } from '../auth/auth.module';
import { RoomUseCase } from '../room/room.usecase';
import { SequelizeRoomRepository } from '../room/room.repository';
import { SequelizeModule } from '@nestjs/sequelize';
import { RoomModel } from '../room/models/room.model';
import { RoomModule } from '../room/room.module';

@Module({
  controllers: [CallController],
  providers: [
    CallService,
    PaymentService,
    ConfigService,
    RoomUseCase,
    SequelizeRoomRepository,
  ],
  imports: [
    HttpClientModule,
    ConfigModule,
    AuthModule,
    RoomModule,
    SequelizeModule.forFeature([RoomModel]),
  ],
})
export class CallModule {}
