import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Transaction, Op } from 'sequelize';
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
    transaction?: Transaction,
  ): Promise<RoomUser> {
    const roomUser = await this.roomUserModel.create(data, { transaction });
    return RoomUser.build(roomUser);
  }

  async findById(
    id: string,
    options?: { transaction?: Transaction; lock?: boolean },
  ): Promise<RoomUser | null> {
    const roomUser = await this.roomUserModel.findOne({
      where: { id },
      lock: options?.lock,
      transaction: options?.transaction,
    });
    return roomUser ? RoomUser.build(roomUser) : null;
  }

  async findByUserIdAndRoomId(
    userId: string,
    roomId: string,
    options?: { transaction?: Transaction; lock?: boolean },
  ): Promise<RoomUser | null> {
    const roomUser = await this.roomUserModel.findOne({
      where: { userId, roomId },
      lock: options?.lock,
      transaction: options?.transaction,
    });
    return roomUser ? RoomUser.build(roomUser) : null;
  }

  async findUserInRoom(userId: string, roomId: string): Promise<RoomUser[]> {
    const roomUsers = await this.roomUserModel.findAll({
      where: { userId, roomId },
    });
    return roomUsers.map((roomUser) => RoomUser.build(roomUser));
  }

  async findAllByRoomId(roomId: string): Promise<RoomUser[]> {
    const roomUsers = await this.roomUserModel.findAll({ where: { roomId } });
    return roomUsers.map((roomUser) => RoomUser.build(roomUser));
  }

  async countByRoomId(roomId: string): Promise<number> {
    return this.roomUserModel.count({ where: { roomId } });
  }

  async update(
    id: string,
    data: Partial<RoomUserAttributes>,
    transaction?: Transaction,
  ): Promise<void> {
    await this.roomUserModel.update(data, { where: { id }, transaction });
  }

  async delete(id: string): Promise<void> {
    await this.roomUserModel.destroy({ where: { id } });
  }

  async updateByUserIdAndRoomId(
    userId: string,
    roomId: string,
    data: Partial<RoomUserAttributes>,
  ): Promise<void> {
    await this.roomUserModel.update(data, { where: { userId, roomId } });
  }

  async deleteByUserIdAndRoomId(userId: string, roomId: string): Promise<void> {
    await this.roomUserModel.destroy({ where: { userId, roomId } });
  }

  async findByParticipantIdAndRoomId(
    participantId: string,
    roomId: string,
  ): Promise<RoomUser | null> {
    const roomUser = await this.roomUserModel.findOne({
      where: { participantId, roomId },
    });
    return roomUser ? RoomUser.build(roomUser) : null;
  }

  async deleteByParticipantIdAndRoomId(
    participantId: string,
    roomId: string,
  ): Promise<void> {
    await this.roomUserModel.destroy({ where: { participantId, roomId } });
  }

  async deleteByParticipantAndTimestamp(
    roomUserId: string,
    participantId: string,
    maxTimestamp: Date,
    transaction?: Transaction,
  ): Promise<number> {
    return await this.roomUserModel.destroy({
      where: {
        id: roomUserId,
        participantId,
        joinedAt: { [Op.lte]: maxTimestamp },
      },
      transaction,
    });
  }
}
