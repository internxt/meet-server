// src/modules/room/models/room.domain.ts

import { RoomModel } from './models/room.model';

export interface RoomAttributes {
  id: string;
  maxUsersAllowed: number;
  hostId: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export class Room implements RoomAttributes {
  id: string;
  maxUsersAllowed: number;
  hostId: string;
  createdAt?: Date;
  updatedAt?: Date;

  constructor(attributes: RoomAttributes) {
    Object.assign(this, attributes);
  }

  toJSON(): Record<string, any> {
    return {
      id: this.id,
      maxUsersAllowed: this.maxUsersAllowed,
      hostId: this.hostId,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }

  static build(attributes: RoomAttributes): Room {
    return new Room({
      id: attributes.id,
      maxUsersAllowed: attributes.maxUsersAllowed,
      hostId: attributes.hostId,
      createdAt: attributes.createdAt,
      updatedAt: attributes.updatedAt,
    });
  }
}
