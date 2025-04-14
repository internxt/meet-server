export interface RoomAttributes {
  id: string;
  maxUsersAllowed: number;
  hostId: string;
  isClosed?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export class Room implements RoomAttributes {
  id: string;
  maxUsersAllowed: number;
  hostId: string;
  isClosed?: boolean;
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
      isClosed: this.isClosed,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }

  static build(attributes: RoomAttributes): Room {
    return new Room({
      id: attributes.id,
      maxUsersAllowed: attributes.maxUsersAllowed,
      hostId: attributes.hostId,
      isClosed: attributes.isClosed,
      createdAt: attributes.createdAt,
      updatedAt: attributes.updatedAt,
    });
  }
}
