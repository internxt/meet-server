import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { OmitCreateProperties } from '../../../shared/types/OmitCreateProperties';
import { RoomUser, RoomUserAttributes } from '../domain/room-user.domain';
import { RoomUserModel } from '../models/room-user.model';

@Injectable()
export class SequelizeRoomUserRepository {
  constructor(
    @InjectModel(RoomUserModel)
    private readonly roomUserModel: typeof RoomUserModel,
  ) {}

  async create(
    data: OmitCreateProperties<RoomUserAttributes>,
  ): Promise<RoomUser> {
    const roomUser = await this.roomUserModel.create(data);
    return RoomUser.build(roomUser);
  }

  async findById(id: number): Promise<RoomUser | null> {
    const roomUser = await this.roomUserModel.findByPk(id);
    return roomUser ? RoomUser.build(roomUser) : null;
  }

  async findByUserIdAndRoomId(
    userId: string,
    roomId: string,
  ): Promise<RoomUser | null> {
    const roomUser = await this.roomUserModel.findOne({
      where: { userId, roomId },
    });
    return roomUser ? RoomUser.build(roomUser) : null;
  }

  async findAllByRoomId(roomId: string): Promise<RoomUser[]> {
    const roomUsers = await this.roomUserModel.findAll({ where: { roomId } });
    return roomUsers.map((roomUser) => RoomUser.build(roomUser));
  }

  async countByRoomId(roomId: string): Promise<number> {
    return this.roomUserModel.count({ where: { roomId } });
  }

  async update(id: number, data: Partial<RoomUserAttributes>): Promise<void> {
    await this.roomUserModel.update(data, { where: { id } });
  }

  async delete(id: string): Promise<void> {
    await this.roomUserModel.destroy({ where: { id } });
  }

  async deleteByUserIdAndRoomId(userId: string, roomId: string): Promise<void> {
    await this.roomUserModel.destroy({ where: { userId, roomId } });
  }
}
