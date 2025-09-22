import { Chance } from 'chance';
import { UserTokenData } from '../auth/dto/user.dto';
import { Room } from './domain/room.domain';
import { CreateCallResponseDto } from './dto/create-call.dto';
import { RoomUser, RoomUserAttributes } from './domain/room-user.domain';
import { User } from '../../shared/user/user.domain';
import { v4 } from 'uuid';

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

export const createMockRoomUser = (
  overrides?: Partial<RoomUserAttributes>,
): RoomUser => {
  const mockRoomUserData: RoomUserAttributes = {
    id: v4(),
    roomId: randomDataGenerator.guid(),
    userId: randomDataGenerator.guid(),
    name: randomDataGenerator.first(),
    lastName: randomDataGenerator.last(),
    anonymous: false,
    createdAt: randomDataGenerator.date(),
    updatedAt: randomDataGenerator.date(),
  };

  return new RoomUser({
    ...mockRoomUserData,
    ...overrides,
  });
};

export const createMockUser = (overrides?: Partial<User>): User => {
  const mockUserData = {
    id: randomDataGenerator.integer({ min: 1, max: 1000 }),
    userId: randomDataGenerator.guid(),
    name: randomDataGenerator.first(),
    lastname: randomDataGenerator.last(),
    email: randomDataGenerator.email(),
    username: randomDataGenerator.name(),
    uuid: randomDataGenerator.guid(),
    avatar: randomDataGenerator.avatar(),
    createdAt: randomDataGenerator.date(),
    updatedAt: randomDataGenerator.date(),
  };
  return new User({
    ...mockUserData,
    ...overrides,
  });
};
