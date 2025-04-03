import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { RoomModel } from './models/room.model';
import { RoomUseCase } from './room.usecase';
import { SequelizeRoomRepository } from './room.repository';

@Module({
  imports: [SequelizeModule.forFeature([RoomModel])],
  providers: [RoomUseCase, SequelizeRoomRepository],
  exports: [RoomUseCase],
})
export class RoomModule {}
