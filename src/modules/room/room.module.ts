import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { RoomModel } from './models/room.model';
import { RoomUseCase } from './room.usecase';
import { SequelizeRoomRepository } from './room.repository';
import { RoomUserModel } from './models/room-user.model';
import { SequelizeRoomUserRepository } from './room-user.repository';
import { RoomUserUseCase } from './room-user.usecase';
import { AvatarService } from 'src/externals/avatar/avatar.service';
import { UserModule } from '../user/user.module';

@Module({
  imports: [SequelizeModule.forFeature([RoomModel, RoomUserModel]), UserModule],
  providers: [
    RoomUseCase,
    SequelizeRoomRepository,
    RoomUserUseCase,
    SequelizeRoomUserRepository,
    AvatarService,
  ],
  exports: [RoomUseCase, RoomUserUseCase],
})
export class RoomModule {}
