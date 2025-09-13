export interface UserAttributes {
  id: number;
  userId: string;
  uuid: string;
  name: string;
  lastname: string;
  email: string;
  username: string;
  avatar?: string;
  tierId?: string;
  updatedAt?: Date;
  createdAt?: Date;
}

export interface UserDataForToken {
  name?: string;
  email?: string;
  lastName?: string;
}
