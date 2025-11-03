const ROOM_EXPIRATION_DAYS = 30;
export interface RoomAttributes {
  id: string;
  maxUsersAllowed: number;
  hostId: string;
  isClosed?: boolean;
  removeAt?: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

export class Room implements RoomAttributes {
  id: string;
  maxUsersAllowed: number;
  hostId: string;
  isClosed?: boolean;
  removeAt?: Date;
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
      removeAt: this.removeAt,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
  static getRoomExpirationDays() {
    return ROOM_EXPIRATION_DAYS;
  }

  static build(attributes: RoomAttributes): Room {
    return new Room({
      id: attributes.id,
      maxUsersAllowed: attributes.maxUsersAllowed,
      hostId: attributes.hostId,
      isClosed: attributes.isClosed,
      removeAt: attributes.removeAt,
      createdAt: attributes.createdAt,
      updatedAt: attributes.updatedAt,
    });
  }
}
