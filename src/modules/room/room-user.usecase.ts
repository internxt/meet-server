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
import { UsersInRoomDto } from './dto/users-in-room.dto';
import { UserRepository } from '../user/user.repository';
import { AvatarService } from '../../externals/avatar/avatar.service';
import { User } from '../user/user.domain';

@Injectable()
export class RoomUserUseCase {
  constructor(
    private readonly roomUserRepository: SequelizeRoomUserRepository,
    private readonly roomUseCase: RoomUseCase,
    private readonly userRepository: UserRepository,
    private readonly avatarService: AvatarService,
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

  async getUsersInRoom(roomId: string): Promise<UsersInRoomDto[]> {
    const room = await this.getRoomOrThrow(roomId);
    const roomUsers = await this.roomUserRepository.findAllByRoomId(room.id);
    const users = await this.getUsersByRoomUsers(roomUsers);
    const userAvatars = await this.getUserAvatars(users);

    return roomUsers.map((roomUser) => ({
      id: roomUser.userId,
      name: roomUser.name,
      lastName: roomUser.lastName,
      anonymous: roomUser.anonymous,
      avatar: userAvatars.get(roomUser.userId),
    }));
  }

  private async getRoomOrThrow(roomId: string) {
    const room = await this.roomUseCase.getRoomByRoomId(roomId);
    if (!room) {
      throw new NotFoundException(`Specified room not found`);
    }
    return room;
  }

  private async getUsersByRoomUsers(roomUsers: RoomUser[]): Promise<User[]> {
    return this.userRepository.findManyByUuid(
      roomUsers.map((roomUser) => roomUser.userId),
    );
  }

  private async getUserAvatars(users: User[]): Promise<Map<string, string>> {
    const userAvatars = new Map<string, string>();

    await Promise.all(
      users.map(async (user) => {
        if (user.avatar) {
          const avatar = await this.avatarService.getDownloadUrl(user.avatar);
          userAvatars.set(user.uuid, avatar);
        }
      }),
    );

    return userAvatars;
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
