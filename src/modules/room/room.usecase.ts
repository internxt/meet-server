import { Injectable } from '@nestjs/common';
import { SequelizeRoomRepository } from './room.repository';
import { Room, RoomAttributes } from './room.domain';

@Injectable()
export class RoomUseCase {
  constructor(private readonly roomRepository: SequelizeRoomRepository) {}

  async createRoom(data: Room) {
    return this.roomRepository.create(data);
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
}
