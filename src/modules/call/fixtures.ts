import { Chance } from 'chance';
import { UserTokenData } from '../auth/dto/user.dto';
import { Room } from '../room/room.domain';
import { CreateCallResponseDto } from './dto/create-call.dto';

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

export const mockRoomData = {
  id: randomDataGenerator.guid(),
  hostId: randomDataGenerator.guid(),
  maxUsersAllowed: randomDataGenerator.integer({ min: 2, max: 10 }),
  isClosed: false,
  createdAt: randomDataGenerator.date(),
  updatedAt: randomDataGenerator.date(),
};

export const createMockRoom = (overrides?: Partial<Room>): Room => ({
  ...mockRoomData,
  ...overrides,
  toJSON: () => mockRoomData,
});

export const mockCallResponse: CreateCallResponseDto = {
  token: randomDataGenerator.string({ length: 32 }),
  room: mockRoomData.id,
  paxPerCall: mockRoomData.maxUsersAllowed,
  appId: 'testAppId',
};

export const createMockCallResponse = (
  overrides?: Partial<CreateCallResponseDto>,
) => ({
  ...mockCallResponse,
  ...overrides,
});
