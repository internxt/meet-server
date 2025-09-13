import { UserAttributes } from './user.attributes';
export class User implements UserAttributes {
  id: number;
  userId: string;
  name: string;
  lastname: string;
  email: string;
  username: string;
  uuid: string;
  avatar: string;
  tierId?: string;
  updatedAt?: Date;
  createdAt?: Date;

  constructor(attributes: UserAttributes) {
    Object.assign(this, attributes);
  }

  static build(user: UserAttributes): User {
    return new User(user);
  }

  toJSON() {
    return {
      id: this.id,
      userId: this.userId,
      name: this.name,
      lastname: this.lastname,
      email: this.email,
      username: this.username,
      uuid: this.uuid,
      avatar: this.avatar,
    };
  }
}
