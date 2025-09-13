import { createMock, DeepMocked } from '@golevelup/ts-jest';
import { Test, TestingModule } from '@nestjs/testing';
import { RoomUserUseCase } from './room-user.usecase';
import { SequelizeRoomUserRepository } from './infrastructure/room-user.repository';
import { RoomUseCase } from './room.usecase';
import { RoomUser } from './domain/room-user.domain';
import { Room } from './domain/room.domain';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { UserRepository } from '../../shared/user/user.repository';
import { createMockUser } from '../../shared/user/fixtures';
import { AvatarService } from '../../externals/avatar/avatar.service';

jest.mock('uuid');

describe('RoomUserUseCase', () => {
  let roomUserUseCase: RoomUserUseCase;
  let roomUserRepository: DeepMocked<SequelizeRoomUserRepository>;
  let roomUseCase: DeepMocked<RoomUseCase>;
  let userRepository: DeepMocked<UserRepository>;
  let avatarService: DeepMocked<AvatarService>;

  const mockRoomData = {
    id: 'test-room-id',
    hostId: 'test-host-id',
    maxUsersAllowed: 5,
  };

  const mockRoomUserData = {
    id: 1,
    roomId: 'test-room-id',
    userId: 'test-user-id',
    name: 'Test User',
    lastName: 'Smith',
    anonymous: false,
  };

  beforeEach(async () => {
    const roomUserRepositoryMock = createMock<SequelizeRoomUserRepository>();
    const roomUseCaseMock = createMock<RoomUseCase>();
    const userRepositoryMock = createMock<UserRepository>();
    const avatarServiceMock = createMock<AvatarService>();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RoomUserUseCase,
        {
          provide: SequelizeRoomUserRepository,
          useValue: roomUserRepositoryMock,
        },
        {
          provide: RoomUseCase,
          useValue: roomUseCaseMock,
        },
        {
          provide: UserRepository,
          useValue: userRepositoryMock,
        },
        {
          provide: AvatarService,
          useValue: avatarServiceMock,
        },
      ],
    }).compile();

    roomUserUseCase = module.get<RoomUserUseCase>(RoomUserUseCase);
    roomUserRepository = module.get<DeepMocked<SequelizeRoomUserRepository>>(
      SequelizeRoomUserRepository,
    );
    roomUseCase = module.get<DeepMocked<RoomUseCase>>(RoomUseCase);
    userRepository = module.get<DeepMocked<UserRepository>>(UserRepository);
    avatarService = module.get<DeepMocked<AvatarService>>(AvatarService);

    (uuidv4 as jest.Mock).mockReturnValue('generated-uuid');
  });

  describe('Add User To Room', () => {
    it('When the room does not exist, then a NotFoundException is thrown', async () => {
      const getRoomByRoomIdMock = jest
        .spyOn(roomUseCase, 'getRoomByRoomId')
        .mockResolvedValueOnce(null);

      await expect(
        roomUserUseCase.addUserToRoom('nonexistent-room', {
          userId: 'test-user-id',
        }),
      ).rejects.toThrow(NotFoundException);

      expect(getRoomByRoomIdMock).toHaveBeenCalledWith('nonexistent-room');
    });

    it('When the room is full, then a BadRequestException is thrown', async () => {
      const getRoomByRoomIdMock = jest
        .spyOn(roomUseCase, 'getRoomByRoomId')
        .mockResolvedValueOnce(createMock<Room>(mockRoomData));
      const countByRoomIdMock = jest
        .spyOn(roomUserRepository, 'countByRoomId')
        .mockResolvedValueOnce(5); // Room is full (max 5)

      await expect(
        roomUserUseCase.addUserToRoom('test-room-id', {
          userId: 'test-user-id',
        }),
      ).rejects.toThrow(BadRequestException);

      expect(getRoomByRoomIdMock).toHaveBeenCalledWith('test-room-id');
      expect(countByRoomIdMock).toHaveBeenCalledWith('test-room-id');
    });

    it('When no userId is provided or user is anonymous, then a UUID is generated', async () => {
      const getRoomByRoomIdMock = jest
        .spyOn(roomUseCase, 'getRoomByRoomId')
        .mockResolvedValueOnce(new Room(mockRoomData));
      const countByRoomIdMock = jest
        .spyOn(roomUserRepository, 'countByRoomId')
        .mockResolvedValueOnce(2); // Room has space
      jest
        .spyOn(roomUserRepository, 'findByUserIdAndRoomId')
        .mockResolvedValueOnce(null);
      const createMock = jest
        .spyOn(roomUserRepository, 'create')
        .mockResolvedValueOnce(
          new RoomUser({
            ...mockRoomUserData,
            userId: 'generated-uuid',
            anonymous: true,
          }),
        );

      const result = await roomUserUseCase.addUserToRoom('test-room-id', {
        anonymous: true,
      });

      expect(uuidv4).toHaveBeenCalled();
      expect(createMock).toHaveBeenCalledWith(
        expect.objectContaining({
          roomId: 'test-room-id',
          userId: 'generated-uuid',
          anonymous: true,
        }),
      );
      expect(result.userId).toBe('generated-uuid');
      expect(result.anonymous).toBe(true);
    });

    it('When the user is already in the room, then a ConflictException is thrown', async () => {
      const getRoomByRoomIdMock = jest
        .spyOn(roomUseCase, 'getRoomByRoomId')
        .mockResolvedValueOnce(createMock<Room>(mockRoomData));
      const countByRoomIdMock = jest
        .spyOn(roomUserRepository, 'countByRoomId')
        .mockResolvedValueOnce(2); // Room has space
      const findByUserIdAndRoomIdMock = jest
        .spyOn(roomUserRepository, 'findByUserIdAndRoomId')
        .mockResolvedValueOnce(
          new RoomUser({
            ...mockRoomUserData,
            userId: 'test-user-id',
          }),
        );

      await expect(
        roomUserUseCase.addUserToRoom('test-room-id', {
          userId: 'test-user-id',
        }),
      ).rejects.toThrow(ConflictException);

      expect(findByUserIdAndRoomIdMock).toHaveBeenCalledWith(
        'test-user-id',
        'test-room-id',
      );
    });

    it('When all conditions are met, then the user is added to the room successfully', async () => {
      const getRoomByRoomIdMock = jest
        .spyOn(roomUseCase, 'getRoomByRoomId')
        .mockResolvedValueOnce(new Room(mockRoomData));
      const countByRoomIdMock = jest
        .spyOn(roomUserRepository, 'countByRoomId')
        .mockResolvedValueOnce(2); // Room has space
      const findByUserIdAndRoomIdMock = jest
        .spyOn(roomUserRepository, 'findByUserIdAndRoomId')
        .mockResolvedValueOnce(null);
      const createMock = jest
        .spyOn(roomUserRepository, 'create')
        .mockResolvedValueOnce(
          new RoomUser({
            ...mockRoomUserData,
            userId: 'test-user-id',
          }),
        );

      const result = await roomUserUseCase.addUserToRoom('test-room-id', {
        userId: 'test-user-id',
        name: 'Test User',
        lastName: 'Smith',
      });

      expect(createMock).toHaveBeenCalledWith(
        expect.objectContaining({
          roomId: 'test-room-id',
          userId: 'test-user-id',
          name: 'Test User',
          lastName: 'Smith',
          anonymous: false,
        }),
      );
      expect(result).toEqual(expect.objectContaining(mockRoomUserData));
    });
  });

  describe('Get Users In Room', () => {
    it('When the room does not exist, then a NotFoundException is thrown', async () => {
      const getRoomByRoomIdMock = jest
        .spyOn(roomUseCase, 'getRoomByRoomId')
        .mockResolvedValueOnce(null);

      await expect(
        roomUserUseCase.getUsersInRoom('nonexistent-room'),
      ).rejects.toThrow(NotFoundException);

      expect(getRoomByRoomIdMock).toHaveBeenCalledWith('nonexistent-room');
    });

    it('When the room exists, then all users in the room are returned with their avatars', async () => {
      // Setup test data
      const mockRoom = new Room(mockRoomData);
      const mockRoomUsers = [
        new RoomUser(mockRoomUserData),
        new RoomUser({
          ...mockRoomUserData,
          id: 2,
          userId: 'user-2',
          name: 'User 2',
          lastName: 'Last 2',
        }),
      ];
      const mockUsers = [
        createMockUser({
          uuid: 'test-user-id',
          avatar: 'avatar-path-1',
        }),
        createMockUser({
          uuid: 'user-2',
          avatar: 'avatar-path-2',
        }),
      ];
      const mockAvatarUrls = {
        'test-user-id': 'https://example.com/avatar1.jpg',
        'user-2': 'https://example.com/avatar2.jpg',
      };

      const getRoomByRoomIdMock = jest
        .spyOn(roomUseCase, 'getRoomByRoomId')
        .mockResolvedValueOnce(mockRoom);
      const findAllByRoomIdMock = jest
        .spyOn(roomUserRepository, 'findAllByRoomId')
        .mockResolvedValueOnce(mockRoomUsers);
      const findManyByUuidMock = jest
        .spyOn(userRepository, 'findManyByUuid')
        .mockResolvedValueOnce(mockUsers);

      const getDownloadUrlMock = jest
        .spyOn(avatarService, 'getDownloadUrl')
        .mockImplementation((path) => {
          if (path === 'avatar-path-1')
            return Promise.resolve(mockAvatarUrls['test-user-id']);
          if (path === 'avatar-path-2')
            return Promise.resolve(mockAvatarUrls['user-2']);
          return Promise.resolve(null);
        });

      // Execute the method
      const result = await roomUserUseCase.getUsersInRoom('test-room-id');

      // Verify the results
      expect(getRoomByRoomIdMock).toHaveBeenCalledWith('test-room-id');
      expect(findAllByRoomIdMock).toHaveBeenCalledWith('test-room-id');
      expect(findManyByUuidMock).toHaveBeenCalledWith(
        expect.arrayContaining(['test-user-id', 'user-2']),
      );
      expect(getDownloadUrlMock).toHaveBeenCalledTimes(2);

      // Check the structure and content of the result
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        id: 'test-user-id',
        name: 'Test User',
        lastName: 'Smith',
        anonymous: false,
        avatar: 'https://example.com/avatar1.jpg',
      });
      expect(result[1]).toEqual({
        id: 'user-2',
        name: 'User 2',
        lastName: 'Last 2',
        anonymous: false,
        avatar: 'https://example.com/avatar2.jpg',
      });
    });

    it('When users have no avatars, the avatar field should be null', async () => {
      const mockRoom = new Room(mockRoomData);
      const mockRoomUsers = [new RoomUser(mockRoomUserData)];
      const mockUsers = [
        createMockUser({
          uuid: 'test-user-id',
          avatar: null,
        }),
      ];

      const getRoomByRoomIdMock = jest
        .spyOn(roomUseCase, 'getRoomByRoomId')
        .mockResolvedValueOnce(mockRoom);
      const findAllByRoomIdMock = jest
        .spyOn(roomUserRepository, 'findAllByRoomId')
        .mockResolvedValueOnce(mockRoomUsers);
      const findManyByUuidMock = jest
        .spyOn(userRepository, 'findManyByUuid')
        .mockResolvedValueOnce(mockUsers);

      const result = await roomUserUseCase.getUsersInRoom('test-room-id');

      const getDownloadUrlMock = jest.spyOn(avatarService, 'getDownloadUrl');

      // Verify the results
      expect(getRoomByRoomIdMock).toHaveBeenCalledWith('test-room-id');
      expect(findAllByRoomIdMock).toHaveBeenCalledWith('test-room-id');
      expect(findManyByUuidMock).toHaveBeenCalledWith(['test-user-id']);
      expect(getDownloadUrlMock).not.toHaveBeenCalled();

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        id: 'test-user-id',
        name: 'Test User',
        lastName: 'Smith',
        anonymous: false,
        avatar: null,
      });
    });

    it('When the room has no users, it should return an empty array', async () => {
      const mockRoom = new Room(mockRoomData);

      const getRoomByRoomIdMock = jest
        .spyOn(roomUseCase, 'getRoomByRoomId')
        .mockResolvedValueOnce(mockRoom);
      const findAllByRoomIdMock = jest
        .spyOn(roomUserRepository, 'findAllByRoomId')
        .mockResolvedValueOnce([]);
      const findManyByUuidMock = jest
        .spyOn(userRepository, 'findManyByUuid')
        .mockResolvedValueOnce([]);

      const result = await roomUserUseCase.getUsersInRoom('test-room-id');

      const getDownloadUrlMock = jest.spyOn(avatarService, 'getDownloadUrl');

      expect(getRoomByRoomIdMock).toHaveBeenCalledWith('test-room-id');
      expect(findAllByRoomIdMock).toHaveBeenCalledWith('test-room-id');
      expect(findManyByUuidMock).toHaveBeenCalledWith([]);
      expect(getDownloadUrlMock).not.toHaveBeenCalled();

      expect(result).toEqual([]);
      expect(result).toHaveLength(0);
    });

    it('When user record is not found for a room user, avatars should still be handled correctly', async () => {
      const mockRoom = new Room(mockRoomData);
      const mockRoomUsers = [
        new RoomUser(mockRoomUserData),
        new RoomUser({
          ...mockRoomUserData,
          id: 2,
          userId: 'user-2',
          name: 'User 2',
          lastName: 'Last 2',
        }),
      ];
      const mockUsers = [
        createMockUser({
          uuid: 'test-user-id',
          avatar: 'avatar-path-1',
        }),
      ];
      const mockAvatarUrls = {
        'test-user-id': 'https://example.com/avatar1.jpg',
      };

      const getRoomByRoomIdMock = jest
        .spyOn(roomUseCase, 'getRoomByRoomId')
        .mockResolvedValueOnce(mockRoom);
      const findAllByRoomIdMock = jest
        .spyOn(roomUserRepository, 'findAllByRoomId')
        .mockResolvedValueOnce(mockRoomUsers);
      const findManyByUuidMock = jest
        .spyOn(userRepository, 'findManyByUuid')
        .mockResolvedValueOnce(mockUsers);

      const getDownloadUrlMock = jest
        .spyOn(avatarService, 'getDownloadUrl')
        .mockImplementation((path) => {
          if (path === 'avatar-path-1')
            return Promise.resolve(mockAvatarUrls['test-user-id']);
          return Promise.resolve(null);
        });

      const result = await roomUserUseCase.getUsersInRoom('test-room-id');

      expect(getRoomByRoomIdMock).toHaveBeenCalledWith('test-room-id');
      expect(findAllByRoomIdMock).toHaveBeenCalledWith('test-room-id');
      expect(findManyByUuidMock).toHaveBeenCalledWith(
        expect.arrayContaining(['test-user-id', 'user-2']),
      );
      expect(getDownloadUrlMock).toHaveBeenCalledTimes(1);

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        id: 'test-user-id',
        name: 'Test User',
        lastName: 'Smith',
        anonymous: false,
        avatar: 'https://example.com/avatar1.jpg',
      });
      expect(result[1]).toEqual({
        id: 'user-2',
        name: 'User 2',
        lastName: 'Last 2',
        anonymous: false,
        avatar: null,
      });
    });
  });

  describe('Count Users In Room', () => {
    it('When the room does not exist, then a NotFoundException is thrown', async () => {
      const getRoomByRoomIdMock = jest
        .spyOn(roomUseCase, 'getRoomByRoomId')
        .mockResolvedValueOnce(null);

      await expect(
        roomUserUseCase.countUsersInRoom('nonexistent-room'),
      ).rejects.toThrow(NotFoundException);

      expect(getRoomByRoomIdMock).toHaveBeenCalledWith('nonexistent-room');
    });

    it('When the room exists, then the count of users in the room is returned', async () => {
      const getRoomByRoomIdMock = jest
        .spyOn(roomUseCase, 'getRoomByRoomId')
        .mockResolvedValueOnce(createMock<Room>(mockRoomData));
      const countByRoomIdMock = jest
        .spyOn(roomUserRepository, 'countByRoomId')
        .mockResolvedValueOnce(3);

      const result = await roomUserUseCase.countUsersInRoom('test-room-id');

      expect(countByRoomIdMock).toHaveBeenCalledWith('test-room-id');
      expect(result).toBe(3);
    });
  });

  describe('Remove User From Room', () => {
    const mockRoom = new Room(mockRoomData);
    it('When the room exists, then the user is removed from the room', async () => {
      jest
        .spyOn(roomUseCase, 'getRoomByRoomId')
        .mockResolvedValueOnce(createMock<Room>(mockRoomData));
      const deleteByUserIdAndRoomIdMock = jest
        .spyOn(roomUserRepository, 'deleteByUserIdAndRoomId')
        .mockResolvedValueOnce(undefined);

      await roomUserUseCase.removeUserFromRoom('test-user-id', mockRoom);

      expect(deleteByUserIdAndRoomIdMock).toHaveBeenCalledWith(
        'test-user-id',
        'test-room-id',
      );
    });
  });
});
