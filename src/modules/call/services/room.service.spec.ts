import { createMock } from '@golevelup/ts-jest';
import { Test, TestingModule } from '@nestjs/testing';
import { RoomService } from './room.service';
import { SequelizeRoomRepository } from '../infrastructure/room.repository';
import { SequelizeRoomUserRepository } from '../infrastructure/room-user.repository';
import { UserRepository } from '../../../shared/user/user.repository';
import { AvatarService } from '../../../externals/avatar/avatar.service';
import { Room } from '../domain/room.domain';
import { mockRoomData, createMockRoomUser, createMockUser } from '../fixtures';
import { v4 } from 'uuid';
import { Time } from '../../../common/time';

describe('Room Service', () => {
  let roomService: RoomService;
  let roomRepository: SequelizeRoomRepository;
  let roomUserRepository: SequelizeRoomUserRepository;
  let userRepository: UserRepository;
  let avatarService: AvatarService;
  let moduleRef: TestingModule;

  beforeEach(async () => {
    moduleRef = await Test.createTestingModule({
      providers: [RoomService],
    })
      .useMocker(createMock)
      .compile();

    roomService = moduleRef.get<RoomService>(RoomService);
    roomRepository = moduleRef.get<SequelizeRoomRepository>(
      SequelizeRoomRepository,
    );
    roomUserRepository = moduleRef.get<SequelizeRoomUserRepository>(
      SequelizeRoomUserRepository,
    );
    userRepository = moduleRef.get<UserRepository>(UserRepository);
    avatarService = moduleRef.get<AvatarService>(AvatarService);
  });

  describe('Creating a room', () => {
    it('When valida data is passed, then it should create a room successfully', async () => {
      const mockRoom = createMock<Room>(mockRoomData);
      jest.spyOn(roomRepository, 'create').mockResolvedValueOnce(mockRoom);

      const result = await roomService.createRoom(mockRoom);

      expect(roomRepository.create).toHaveBeenCalledWith(mockRoom);
      expect(result).toEqual(mockRoom);
    });
  });

  describe('getRoomByRoomId', () => {
    it('When room exists, then it should return the room', async () => {
      const mockRoom = createMock<Room>(mockRoomData);
      jest.spyOn(roomRepository, 'findById').mockResolvedValueOnce(mockRoom);

      const result = await roomService.getRoomByRoomId(mockRoomData.id);

      expect(roomRepository.findById).toHaveBeenCalledWith(mockRoomData.id);
      expect(result).toEqual(mockRoom);
    });

    it('When room does not exist, then it should return empty', async () => {
      jest.spyOn(roomRepository, 'findById').mockResolvedValueOnce(null);

      const result = await roomService.getRoomByRoomId(mockRoomData.id);

      expect(roomRepository.findById).toHaveBeenCalledWith(mockRoomData.id);
      expect(result).toBeNull();
    });
  });

  describe('getRoomByHostId', () => {
    it('When room is found by host ID, then it should return the room', async () => {
      const mockRoom = createMock<Room>(mockRoomData);
      jest
        .spyOn(roomRepository, 'findByHostId')
        .mockResolvedValueOnce(mockRoom);

      const result = await roomService.getRoomByHostId(mockRoomData.hostId);

      expect(roomRepository.findByHostId).toHaveBeenCalledWith(
        mockRoomData.hostId,
      );
      expect(result).toEqual(mockRoom);
    });

    it('When room is not found by host ID, then it should return null', async () => {
      jest.spyOn(roomRepository, 'findByHostId').mockResolvedValueOnce(null);

      const result = await roomService.getRoomByHostId(mockRoomData.hostId);

      expect(roomRepository.findByHostId).toHaveBeenCalledWith(
        mockRoomData.hostId,
      );
      expect(result).toBeNull();
    });
  });

  describe('updateRoom', () => {
    const mockUpdateData = {
      maxUsersAllowed: 10,
    };

    it('When valid update data is provided, then it should update room successfully', async () => {
      const mockUpdatedRoom = createMock<Room>({
        ...mockRoomData,
        maxUsersAllowed: 10,
      });

      jest.spyOn(roomRepository, 'update').mockResolvedValueOnce();
      jest
        .spyOn(roomRepository, 'findById')
        .mockResolvedValueOnce(mockUpdatedRoom);

      const result = await roomService.updateRoom(
        mockRoomData.id,
        mockUpdateData,
      );

      expect(roomRepository.update).toHaveBeenCalledWith(
        mockRoomData.id,
        mockUpdateData,
      );
      expect(roomRepository.findById).toHaveBeenCalledWith(mockRoomData.id);
      expect(result).toEqual(mockUpdatedRoom);
    });
  });

  describe('removeRoom', () => {
    it('When room ID is provided, then it should remove room successfully', async () => {
      jest.spyOn(roomRepository, 'delete').mockResolvedValueOnce();

      await roomService.removeRoom(mockRoomData.id);

      expect(roomRepository.delete).toHaveBeenCalledWith(mockRoomData.id);
    });
  });

  describe('closeRoom', () => {
    it('When called, then it should mark room as closed', async () => {
      jest.spyOn(roomRepository, 'update').mockResolvedValueOnce();
      const roomId = mockRoomData.id;
      await roomService.closeRoom(roomId);
      expect(roomRepository.update).toHaveBeenCalledWith(roomId, {
        isClosed: true,
      });
    });
  });

  describe('openRoom', () => {
    it('When called, then it should mark room as open', async () => {
      jest.spyOn(roomRepository, 'update').mockResolvedValueOnce();
      const roomId = mockRoomData.id;
      await roomService.openRoom(roomId);
      expect(roomRepository.update).toHaveBeenCalledWith(roomId, {
        isClosed: false,
      });
    });
  });

  describe('setExpirationTime', () => {
    const currentDate = new Date('2025-11-01T00:00:00.000Z');

    beforeEach(() => {
      jest.useFakeTimers();
      jest.setSystemTime(currentDate);
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('When called, then it should update room with expiration time 30 days from now', async () => {
      const roomId = mockRoomData.id;

      const expectedExpirationDate = Time.dateWithTimeAdded(30, 'day');
      jest.spyOn(roomRepository, 'updateWhere').mockResolvedValueOnce();

      await roomService.setExpirationTime(roomId);

      expect(roomRepository.updateWhere).toHaveBeenCalledWith(
        { removeAt: null, id: roomId },
        { removeAt: expectedExpirationDate },
      );
    });
  });

  describe('getOpenRoomByHostId', () => {
    it('When open room is found by host ID, then it should return the room', async () => {
      const mockRoom = createMock<Room>(mockRoomData);
      jest
        .spyOn(roomRepository, 'findByHostId')
        .mockResolvedValueOnce(mockRoom);

      const result = await roomService.getOpenRoomByHostId(mockRoomData.hostId);

      expect(roomRepository.findByHostId).toHaveBeenCalledWith(
        mockRoomData.hostId,
        {
          isClosed: false,
        },
      );
      expect(result).toEqual(mockRoom);
    });

    it('When open room is not found by host ID, then it should return null', async () => {
      jest.spyOn(roomRepository, 'findByHostId').mockResolvedValueOnce(null);

      const result = await roomService.getOpenRoomByHostId(mockRoomData.hostId);

      expect(roomRepository.findByHostId).toHaveBeenCalledWith(
        mockRoomData.hostId,
        {
          isClosed: false,
        },
      );
      expect(result).toBeNull();
    });
  });

  describe('createUserInRoom', () => {
    it('When valid user data is provided, then it should create a user in room successfully', async () => {
      const mockRoomUser = createMockRoomUser();
      const createData = {
        roomId: mockRoomUser.roomId,
        userId: mockRoomUser.userId,
        name: mockRoomUser.name,
        lastName: mockRoomUser.lastName,
        anonymous: mockRoomUser.anonymous,
      };

      jest
        .spyOn(roomUserRepository, 'create')
        .mockResolvedValueOnce(mockRoomUser);

      const result = await roomService.createUserInRoom(createData);

      expect(roomUserRepository.create).toHaveBeenCalledWith(createData);
      expect(result).toEqual(mockRoomUser);
    });
  });

  describe('getUsersInRoom', () => {
    it('When no users exist in room, then it should return empty array', async () => {
      jest
        .spyOn(roomUserRepository, 'findAllByRoomId')
        .mockResolvedValueOnce([]);

      const result = await roomService.getUsersInRoom(mockRoomData.id);

      expect(roomUserRepository.findAllByRoomId).toHaveBeenCalledWith(
        mockRoomData.id,
      );
      expect(result).toEqual([]);
    });

    it('When users exist in room with avatars, then it should return users with avatar URLs', async () => {
      const userId = v4();
      const mockUser = createMockUser({
        uuid: userId,
        avatar: 'avatar123.png',
      });
      const mockRoomUser = createMockRoomUser({ userId });

      const avatarUrl = 'https://example.com/avatar.png';

      jest
        .spyOn(roomUserRepository, 'findAllByRoomId')
        .mockResolvedValueOnce([mockRoomUser]);
      jest
        .spyOn(userRepository, 'findManyByUuid')
        .mockResolvedValueOnce([mockUser]);
      jest
        .spyOn(avatarService, 'getDownloadUrl')
        .mockResolvedValueOnce(avatarUrl);

      const result = await roomService.getUsersInRoom(mockRoomData.id);

      expect(roomUserRepository.findAllByRoomId).toHaveBeenCalledWith(
        mockRoomData.id,
      );
      expect(userRepository.findManyByUuid).toHaveBeenCalledWith([
        mockRoomUser.userId,
      ]);
      expect(avatarService.getDownloadUrl).toHaveBeenCalledWith(
        mockUser.avatar,
      );
      expect(result).toEqual([
        {
          id: mockRoomUser.userId,
          name: mockRoomUser.name,
          lastName: mockRoomUser.lastName,
          anonymous: mockRoomUser.anonymous,
          avatar: avatarUrl,
        },
      ]);
    });

    it('When users exist without avatars, then it should handle users with null avatars', async () => {
      const userId = v4();
      const mockRoomUser = createMockRoomUser({ userId });
      const mockUserWithoutAvatar = createMockUser({
        uuid: userId,
        avatar: null,
      });

      jest
        .spyOn(roomUserRepository, 'findAllByRoomId')
        .mockResolvedValueOnce([mockRoomUser]);
      jest
        .spyOn(userRepository, 'findManyByUuid')
        .mockResolvedValueOnce([mockUserWithoutAvatar]);

      const result = await roomService.getUsersInRoom(mockRoomData.id);

      expect(result).toEqual([
        {
          id: mockRoomUser.userId,
          name: mockRoomUser.name,
          lastName: mockRoomUser.lastName,
          anonymous: mockRoomUser.anonymous,
          avatar: null,
        },
      ]);
    });
  });

  describe('countUsersInRoom', () => {
    it('When counting users in room, then it should return the correct count', async () => {
      const expectedCount = 5;
      jest
        .spyOn(roomUserRepository, 'countByRoomId')
        .mockResolvedValueOnce(expectedCount);

      const result = await roomService.countUsersInRoom(mockRoomData.id);

      expect(roomUserRepository.countByRoomId).toHaveBeenCalledWith(
        mockRoomData.id,
      );
      expect(result).toBe(expectedCount);
    });
  });

  describe('removeUserFromRoom', () => {
    it('When removing user from room, then it should remove user successfully', async () => {
      const mockRoom = createMock<Room>(mockRoomData);
      const userId = v4();

      jest
        .spyOn(roomUserRepository, 'deleteByUserIdAndRoomId')
        .mockResolvedValueOnce();

      await roomService.removeUserFromRoom(userId, mockRoom);

      expect(roomUserRepository.deleteByUserIdAndRoomId).toHaveBeenCalledWith(
        userId,
        mockRoom.id,
      );
    });
  });

  describe('getUserInRoom', () => {
    it('When user exists in room, then it should return the user', async () => {
      const mockRoomUser = createMockRoomUser();
      const userId = v4();
      const roomId = mockRoomData.id;

      jest
        .spyOn(roomUserRepository, 'findByUserIdAndRoomId')
        .mockResolvedValueOnce(mockRoomUser);

      const result = await roomService.getUserInRoom(userId, roomId);

      expect(roomUserRepository.findByUserIdAndRoomId).toHaveBeenCalledWith(
        userId,
        roomId,
      );
      expect(result).toEqual(mockRoomUser);
    });

    it('When user does not exist in room, then it should return null', async () => {
      const userId = v4();
      const roomId = mockRoomData.id;

      jest
        .spyOn(roomUserRepository, 'findByUserIdAndRoomId')
        .mockResolvedValueOnce(null);

      const result = await roomService.getUserInRoom(userId, roomId);

      expect(roomUserRepository.findByUserIdAndRoomId).toHaveBeenCalledWith(
        userId,
        roomId,
      );
      expect(result).toBeNull();
    });
  });
});
