import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { SequelizeRoomUserRepository } from './room-user.repository';
import { RoomUser } from './room-user.domain';
import { v4 as uuidv4 } from 'uuid';
import { RoomUseCase } from './room.usecase';

@Injectable()
export class RoomUserUseCase {
  constructor(
    private readonly roomUserRepository: SequelizeRoomUserRepository,
    private readonly roomUseCase: RoomUseCase,
  ) {}

  async addUserToRoom(
    roomId: string,
    userData: {
      userId?: string;
      name?: string;
      lastName?: string;
      anonymous?: boolean;
    },
  ): Promise<RoomUser> {
    const room = await this.roomUseCase.getRoomByRoomId(roomId);
    if (!room) {
      throw new NotFoundException(`Specified room not found`);
    }

    const currentUsersCount =
      await this.roomUserRepository.countByRoomId(roomId);
    if (currentUsersCount >= room.maxUsersAllowed) {
      throw new BadRequestException('The room is full');
    }

    const { userId, name, lastName, anonymous = false } = userData;
    let userIdToUse = userId;

    if (anonymous || !userIdToUse) {
      userIdToUse = uuidv4();
    }

    const existingUser = await this.roomUserRepository.findByUserIdAndRoomId(
      userIdToUse,
      roomId,
    );

    if (existingUser) {
      throw new ConflictException('User is already in this room');
    }

    return this.roomUserRepository.create({
      roomId,
      userId: userIdToUse,
      name,
      lastName,
      anonymous: Boolean(anonymous),
    });
  }

  async getUsersInRoom(roomId: string): Promise<RoomUser[]> {
    const room = await this.roomUseCase.getRoomByRoomId(roomId);
    if (!room) {
      throw new NotFoundException(`Specified room not found`);
    }

    return this.roomUserRepository.findAllByRoomId(roomId);
  }

  async countUsersInRoom(roomId: string): Promise<number> {
    const room = await this.roomUseCase.getRoomByRoomId(roomId);
    if (!room) {
      throw new NotFoundException(`Specified room not found`);
    }

    return this.roomUserRepository.countByRoomId(roomId);
  }

  async removeUserFromRoom(userId: string, roomId: string): Promise<void> {
    const room = await this.roomUseCase.getRoomByRoomId(roomId);
    if (!room) {
      throw new NotFoundException(`Specified room not found`);
    }

    await this.roomUserRepository.deleteByUserIdAndRoomId(userId, roomId);
  }
}
