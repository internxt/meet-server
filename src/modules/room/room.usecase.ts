import { Injectable } from '@nestjs/common';
import { SequelizeRoomRepository } from './room.repository';
import { RoomModel } from './models/room.model';

@Injectable()
export class RoomUseCase {
  constructor(private readonly roomRepository: SequelizeRoomRepository) {}

  async createRoom(data: Partial<RoomModel>) {
    return this.roomRepository.create(data);
  }

  async getRoom(id: RoomModel['id']) {
    return this.roomRepository.findById(id);
  }

  async updateRoom(id: RoomModel['id'], data: Partial<RoomModel>) {
    await this.roomRepository.update(id, data);
    return this.getRoom(id);
  }

  async removeRoom(id: string) {
    return this.roomRepository.delete(id);
  }
}
