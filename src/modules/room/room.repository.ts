import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { OmitCreateProperties } from 'src/types/OmitCreateProperties';
import { Room, RoomAttributes } from './room.domain';
import { RoomModel } from './models/room.model';

@Injectable()
export class SequelizeRoomRepository {
  constructor(
    @InjectModel(RoomModel)
    private readonly roomModel: typeof RoomModel,
  ) {}

  async create(data: OmitCreateProperties<Room>): Promise<Room> {
    const room = await this.roomModel.create(data);
    return Room.build(room);
  }

  async findById(id: RoomAttributes['id']): Promise<Room | null> {
    const room = await this.roomModel.findByPk(id);
    return room ? Room.build(room) : null;
  }

  async findByHostId(
    hostId: string,
    additionalWhere?: Partial<RoomAttributes>,
  ): Promise<Room | null> {
    const room = await this.roomModel.findOne({
      where: { hostId, ...additionalWhere },
    });
    return room ? Room.build(room) : null;
  }

  async update(
    id: RoomAttributes['id'],
    data: Partial<RoomAttributes>,
  ): Promise<void> {
    await this.roomModel.update(data, { where: { id } });
  }

  async delete(id: RoomAttributes['id']): Promise<void> {
    await this.roomModel.destroy({ where: { id } });
  }
}
