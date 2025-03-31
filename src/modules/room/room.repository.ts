import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { RoomModel } from './models/room.model';

@Injectable()
export class SequelizeRoomRepository {
  constructor(
    @InjectModel(RoomModel)
    private readonly roomModel: typeof RoomModel,
  ) {}

  create(data: Partial<RoomModel>) {
    return this.roomModel.create(data);
  }

  findById(id: RoomModel['id']) {
    return this.roomModel.findByPk(id);
  }

  update(id: RoomModel['id'], data: Partial<RoomModel>) {
    return this.roomModel.update(data, { where: { id } });
  }

  delete(id: RoomModel['id']) {
    return this.roomModel.destroy({ where: { id } });
  }
}
