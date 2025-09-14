export interface RoomUserAttributes {
  id: number;
  roomId: string;
  userId: string;
  name?: string;
  lastName?: string;
  anonymous: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export class RoomUser implements RoomUserAttributes {
  id: number;
  roomId: string;
  userId: string;
  name?: string;
  lastName?: string;
  anonymous: boolean;
  createdAt?: Date;
  updatedAt?: Date;

  constructor(attributes: RoomUserAttributes) {
    Object.assign(this, attributes);
  }

  toJSON(): Record<string, any> {
    return {
      id: this.id,
      roomId: this.roomId,
      userId: this.userId,
      name: this.name,
      lastName: this.lastName,
      anonymous: this.anonymous,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }

  static build(attributes: RoomUserAttributes): RoomUser {
    return new RoomUser({
      id: attributes.id,
      roomId: attributes.roomId,
      userId: attributes.userId,
      name: attributes.name,
      lastName: attributes.lastName,
      anonymous: attributes.anonymous,
      createdAt: attributes.createdAt,
      updatedAt: attributes.updatedAt,
    });
  }
}
