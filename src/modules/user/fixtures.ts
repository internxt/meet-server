import { Chance } from 'chance';
import { UserAttributes } from './user.attributes';
import { User } from './user.domain';

const randomDataGenerator = new Chance();

export const mockUserPayload = {
  uuid: randomDataGenerator.guid(),
};

export const createMockUser = (overrides?: Partial<UserAttributes>): User => {
  const email = randomDataGenerator.email();
  const user = new User({
    id: randomDataGenerator.integer(),
    userId: randomDataGenerator.guid(),
    uuid: randomDataGenerator.guid(),
    name: randomDataGenerator.name(),
    lastname: randomDataGenerator.name_suffix(),
    email,
    username: email,
    avatar: `avatars/${randomDataGenerator.guid()}.png`,
    tierId: randomDataGenerator.guid(),
    updatedAt: randomDataGenerator.date(),
    createdAt: randomDataGenerator.date(),
  });

  Object.assign(user, overrides);

  return user;
};
