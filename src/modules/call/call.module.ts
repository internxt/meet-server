import { Module } from '@nestjs/common';
import { CallController } from './call.controller';
import { CallService } from './call.service';
import { RoomModule } from '../room/room.module';
import { CallUseCase } from './call.usecase';

@Module({
  imports: [RoomModule],
  controllers: [CallController],
  providers: [CallService, CallUseCase],
  exports: [CallService],
})
export class CallModule {}
