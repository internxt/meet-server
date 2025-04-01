import { Chance } from 'chance';
import { UserTokenData } from '../auth/dto/user.dto';

const randomDataGenerator = new Chance();

export const mockUserPayload = {
  uuid: randomDataGenerator.guid(),
  email: randomDataGenerator.email(),
  name: randomDataGenerator.name(),
  username: randomDataGenerator.name(),
  lastname: randomDataGenerator.name_suffix(),
  sharedWorkspace: randomDataGenerator.bool(),
  networkCredentials: {
    user: randomDataGenerator.word(),
    pass: randomDataGenerator.word(),
  },
  workspaces: {
    owners: [randomDataGenerator.guid()],
  },
};

export const createMockUserToken = (
  overrides?: Partial<UserTokenData>,
): UserTokenData => ({
  payload: mockUserPayload,
  iat: Math.floor(Date.now() / 1000),
  exp: Math.floor(Date.now() / 1000) + 3600,
  ...overrides,
});
