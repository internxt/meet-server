import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { SequelizeRoomRepository } from '../infrastructure/room.repository';
import { SequelizeRoomUserRepository } from '../infrastructure/room-user.repository';
import { Room, RoomAttributes } from '../domain/room.domain';
import { RoomUser, RoomUserAttributes } from '../domain/room-user.domain';
import { v4 as uuidv4 } from 'uuid';
import { UsersInRoomDto } from '../dto/users-in-room.dto';
import { UserRepository } from '../../../shared/user/user.repository';
import { AvatarService } from '../../../externals/avatar/avatar.service';
import { User } from '../../../shared/user/user.domain';

@Injectable()
export class RoomService {
  constructor(
    private readonly roomRepository: SequelizeRoomRepository,
    private readonly roomUserRepository: SequelizeRoomUserRepository,
    private readonly userRepository: UserRepository,
    private readonly avatarService: AvatarService,
  ) {}

  async createRoom(data: Room) {
    return this.roomRepository.create(data);
  }

  async createUserInRoom(data: Omit<RoomUserAttributes, 'id'>) {
    return this.roomUserRepository.create(data);
  }

  async getRoomByRoomId(id: RoomAttributes['id']) {
    return this.roomRepository.findById(id);
  }

  async getRoomByHostId(hostId: string) {
    return await this.roomRepository.findByHostId(hostId);
  }

  async getOpenRoomByHostId(hostId: string) {
    return await this.roomRepository.findByHostId(hostId, {
      isClosed: false,
    });
  }

  async updateRoom(id: RoomAttributes['id'], data: Partial<RoomAttributes>) {
    await this.roomRepository.update(id, data);
    return this.getRoomByRoomId(id);
  }

  async removeRoom(id: string) {
    return this.roomRepository.delete(id);
  }

  async closeRoom(id: string) {
    return this.roomRepository.update(id, { isClosed: true });
  }

  async openRoom(id: string) {
    return this.roomRepository.update(id, { isClosed: false });
  }

  async addUserToRoom(
    room: Room,
    userData: {
      userId?: string;
      name?: string;
      lastName?: string;
      anonymous?: boolean;
    },
  ): Promise<RoomUser> {
    const currentUsersCount = await this.roomUserRepository.countByRoomId(
      room.id,
    );

    if (currentUsersCount >= room.maxUsersAllowed) {
      throw new BadRequestException('The room is full');
    }

    const { userId, name, lastName, anonymous = false } = userData;

    const existingUser = await this.roomUserRepository.findByUserIdAndRoomId(
      userId,
      room.id,
    );

    if (existingUser) {
      throw new ConflictException('User is already in this room');
    }

    return this.roomUserRepository.create({
      roomId: room.id,
      userId,
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
      avatar: userAvatars.get(roomUser.userId) || null,
    }));
  }

  async countUsersInRoom(roomId: string): Promise<number> {
    const room = await this.getRoomByRoomId(roomId);
    if (!room) {
      throw new NotFoundException(`Specified room not found`);
    }

    return this.roomUserRepository.countByRoomId(roomId);
  }

  async removeUserFromRoom(userId: string, room: Room): Promise<void> {
    await this.roomUserRepository.deleteByUserIdAndRoomId(userId, room.id);
  }

  private async getRoomOrThrow(roomId: string) {
    const room = await this.getRoomByRoomId(roomId);
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

  async getUserInRoom(userId: string, roomId: string) {
    const existingUser = await this.roomUserRepository.findByUserIdAndRoomId(
      userId,
      roomId,
    );

    return existingUser;
  }
}
