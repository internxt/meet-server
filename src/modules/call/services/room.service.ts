import { Injectable } from '@nestjs/common';
import { Sequelize } from 'sequelize-typescript';
import { SequelizeRoomRepository } from '../infrastructure/room.repository';
import { SequelizeRoomUserRepository } from '../infrastructure/room-user.repository';
import { Room, RoomAttributes } from '../domain/room.domain';
import { RoomUser, RoomUserAttributes } from '../domain/room-user.domain';
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
    private readonly sequelize: Sequelize,
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

  async getUsersInRoom(roomId: string): Promise<UsersInRoomDto[]> {
    const roomUsers = await this.roomUserRepository.findAllByRoomId(roomId);

    if (roomUsers.length === 0) {
      return [];
    }

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
    return this.roomUserRepository.countByRoomId(roomId);
  }

  async removeUserFromRoom(userId: string, room: Room): Promise<void> {
    await this.roomUserRepository.deleteByUserIdAndRoomId(userId, room.id);
  }

  async deleteRoomUser(roomUserId: string): Promise<void> {
    await this.roomUserRepository.delete(roomUserId);
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

  async updateRoomUser(
    roomUserId: string,
    data: Partial<RoomUserAttributes>,
  ): Promise<void> {
    await this.roomUserRepository.update(roomUserId, data);
  }

  async handleUserJoined(
    userId: string,
    roomId: string,
    userData: {
      name?: string;
      lastName?: string;
      anonymous?: boolean;
    },
  ): Promise<{ roomUser: RoomUser; oldParticipantId?: string }> {
    let oldParticipantId: string | undefined;
    let roomUser: RoomUser;

    await this.sequelize.transaction(async (transaction) => {
      const existingUser = await this.roomUserRepository.findByUserIdAndRoomId(
        userId,
        roomId,
        { transaction, lock: true },
      );

      if (existingUser) {
        if (existingUser.participantId) {
          oldParticipantId = existingUser.participantId;
        }

        await this.roomUserRepository.update(
          existingUser.id,
          {
            participantId: null,
            joinedAt: null,
          },
          transaction,
        );

        roomUser = existingUser;
      } else {
        roomUser = await this.roomUserRepository.create(
          {
            roomId,
            userId,
            name: userData.name,
            lastName: userData.lastName,
            anonymous: Boolean(userData.anonymous),
          },
          transaction,
        );
      }
    });

    return { roomUser, oldParticipantId };
  }
}
