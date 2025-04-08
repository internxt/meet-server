import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { RoomModel } from './models/room.model';
import { RoomUseCase } from './room.usecase';
import { SequelizeRoomRepository } from './room.repository';
import { RoomUserModel } from './models/room-user.model';
import { SequelizeRoomUserRepository } from './room-user.repository';
import { RoomUserUseCase } from './room-user.usecase';

@Module({
  imports: [SequelizeModule.forFeature([RoomModel, RoomUserModel])],
  providers: [
    RoomUseCase,
    SequelizeRoomRepository,
    RoomUserUseCase,
    SequelizeRoomUserRepository,
  ],
  exports: [RoomUseCase, RoomUserUseCase],
})
export class RoomModule {}
