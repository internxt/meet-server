import { Chance } from 'chance';
import { UserTokenData } from '../auth/dto/user.dto';
import { RoomModel } from '../room/models/room.model';
import { CallResponse } from './call.usecase';

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
  createdAt: randomDataGenerator.date(),
  updatedAt: randomDataGenerator.date(),
};

export const createMockRoom = (overrides?: Partial<RoomModel>) => ({
  ...mockRoomData,
  ...overrides,
});

export const mockCallResponse: CallResponse = {
  token: randomDataGenerator.string({ length: 32 }),
  room: mockRoomData.id,
  paxPerCall: mockRoomData.maxUsersAllowed,
};

export const createMockCallResponse = (overrides?: Partial<CallResponse>) => ({
  ...mockCallResponse,
  ...overrides,
});
