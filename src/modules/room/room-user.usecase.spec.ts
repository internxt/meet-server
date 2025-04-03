import { createMock } from '@golevelup/ts-jest';
import { Test, TestingModule } from '@nestjs/testing';
import { RoomUserUseCase } from './room-user.usecase';
import { SequelizeRoomUserRepository } from './room-user.repository';
import { RoomUseCase } from './room.usecase';
import { RoomUser } from './room-user.domain';
import { Room } from './room.domain';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';

jest.mock('uuid');

describe('RoomUserUseCase', () => {
  let roomUserUseCase: RoomUserUseCase;
  let roomUserRepository: SequelizeRoomUserRepository;
  let roomUseCase: RoomUseCase;

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
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RoomUserUseCase,
        {
          provide: SequelizeRoomUserRepository,
          useValue: {
            create: jest.fn(),
            findByUserIdAndRoomId: jest.fn(),
            findAllByRoomId: jest.fn(),
            countByRoomId: jest.fn(),
            deleteByUserIdAndRoomId: jest.fn(),
          },
        },
        {
          provide: RoomUseCase,
          useValue: {
            getRoomByRoomId: jest.fn(),
          },
        },
      ],
    }).compile();

    roomUserUseCase = module.get<RoomUserUseCase>(RoomUserUseCase);
    roomUserRepository = module.get<SequelizeRoomUserRepository>(
      SequelizeRoomUserRepository,
    );
    roomUseCase = module.get<RoomUseCase>(RoomUseCase);

    (uuidv4 as jest.Mock).mockReturnValue('generated-uuid');
  });

  describe('Add User To Room', () => {
    it('When the room does not exist, then a NotFoundException is thrown', async () => {
      const getRoomByRoomIdSpy = jest
        .spyOn(roomUseCase, 'getRoomByRoomId')
        .mockResolvedValueOnce(null);

      await expect(
        roomUserUseCase.addUserToRoom('nonexistent-room', {
          userId: 'test-user-id',
        }),
      ).rejects.toThrow(NotFoundException);

      expect(getRoomByRoomIdSpy).toHaveBeenCalledWith('nonexistent-room');
    });

    it('When the room is full, then a BadRequestException is thrown', async () => {
      const getRoomByRoomIdSpy = jest
        .spyOn(roomUseCase, 'getRoomByRoomId')
        .mockResolvedValueOnce(createMock<Room>(mockRoomData));

      const countByRoomIdSpy = jest
        .spyOn(roomUserRepository, 'countByRoomId')
        .mockResolvedValueOnce(5); // Room is full (max 5)

      await expect(
        roomUserUseCase.addUserToRoom('test-room-id', {
          userId: 'test-user-id',
        }),
      ).rejects.toThrow(BadRequestException);

      expect(getRoomByRoomIdSpy).toHaveBeenCalledWith('test-room-id');
      expect(countByRoomIdSpy).toHaveBeenCalledWith('test-room-id');
    });

    it('When no userId is provided or user is anonymous, then a UUID is generated', async () => {
      jest
        .spyOn(roomUseCase, 'getRoomByRoomId')
        .mockResolvedValueOnce(createMock<Room>(mockRoomData));

      jest.spyOn(roomUserRepository, 'countByRoomId').mockResolvedValueOnce(2); // Room has space

      jest
        .spyOn(roomUserRepository, 'findByUserIdAndRoomId')
        .mockResolvedValueOnce(null);

      const createSpy = jest
        .spyOn(roomUserRepository, 'create')
        .mockResolvedValueOnce(
          createMock<RoomUser>({
            ...mockRoomUserData,
            userId: 'generated-uuid',
            anonymous: true,
          }),
        );

      const result = await roomUserUseCase.addUserToRoom('test-room-id', {
        anonymous: true,
      });

      expect(uuidv4).toHaveBeenCalled();
      expect(createSpy).toHaveBeenCalledWith(
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
      jest
        .spyOn(roomUseCase, 'getRoomByRoomId')
        .mockResolvedValueOnce(createMock<Room>(mockRoomData));

      jest.spyOn(roomUserRepository, 'countByRoomId').mockResolvedValueOnce(2); // Room has space

      const findByUserIdAndRoomIdSpy = jest
        .spyOn(roomUserRepository, 'findByUserIdAndRoomId')
        .mockResolvedValueOnce(createMock<RoomUser>(mockRoomUserData));

      await expect(
        roomUserUseCase.addUserToRoom('test-room-id', {
          userId: 'test-user-id',
        }),
      ).rejects.toThrow(ConflictException);

      expect(findByUserIdAndRoomIdSpy).toHaveBeenCalledWith(
        'test-user-id',
        'test-room-id',
      );
    });

    it('When all conditions are met, then the user is added to the room successfully', async () => {
      jest
        .spyOn(roomUseCase, 'getRoomByRoomId')
        .mockResolvedValueOnce(createMock<Room>(mockRoomData));

      jest.spyOn(roomUserRepository, 'countByRoomId').mockResolvedValueOnce(2); // Room has space

      jest
        .spyOn(roomUserRepository, 'findByUserIdAndRoomId')
        .mockResolvedValueOnce(null);

      const createSpy = jest
        .spyOn(roomUserRepository, 'create')
        .mockResolvedValueOnce(createMock<RoomUser>(mockRoomUserData));

      const result = await roomUserUseCase.addUserToRoom('test-room-id', {
        userId: 'test-user-id',
        name: 'Test User',
        lastName: 'Smith',
      });

      expect(createSpy).toHaveBeenCalledWith(
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
      const getRoomByRoomIdSpy = jest
        .spyOn(roomUseCase, 'getRoomByRoomId')
        .mockResolvedValueOnce(null);

      await expect(
        roomUserUseCase.getUsersInRoom('nonexistent-room'),
      ).rejects.toThrow(NotFoundException);

      expect(getRoomByRoomIdSpy).toHaveBeenCalledWith('nonexistent-room');
    });

    it('When the room exists, then all users in the room are returned', async () => {
      jest
        .spyOn(roomUseCase, 'getRoomByRoomId')
        .mockResolvedValueOnce(createMock<Room>(mockRoomData));

      const mockUsers = [
        createMock<RoomUser>(mockRoomUserData),
        createMock<RoomUser>({ ...mockRoomUserData, id: 2, userId: 'user-2' }),
      ];

      const findAllByRoomIdSpy = jest
        .spyOn(roomUserRepository, 'findAllByRoomId')
        .mockResolvedValueOnce(mockUsers);

      const result = await roomUserUseCase.getUsersInRoom('test-room-id');

      expect(findAllByRoomIdSpy).toHaveBeenCalledWith('test-room-id');
      expect(result).toEqual(mockUsers);
      expect(result).toHaveLength(2);
    });
  });

  describe('Count Users In Room', () => {
    it('When the room does not exist, then a NotFoundException is thrown', async () => {
      const getRoomByRoomIdSpy = jest
        .spyOn(roomUseCase, 'getRoomByRoomId')
        .mockResolvedValueOnce(null);

      await expect(
        roomUserUseCase.countUsersInRoom('nonexistent-room'),
      ).rejects.toThrow(NotFoundException);

      expect(getRoomByRoomIdSpy).toHaveBeenCalledWith('nonexistent-room');
    });

    it('When the room exists, then the count of users in the room is returned', async () => {
      jest
        .spyOn(roomUseCase, 'getRoomByRoomId')
        .mockResolvedValueOnce(createMock<Room>(mockRoomData));

      const countByRoomIdSpy = jest
        .spyOn(roomUserRepository, 'countByRoomId')
        .mockResolvedValueOnce(3);

      const result = await roomUserUseCase.countUsersInRoom('test-room-id');

      expect(countByRoomIdSpy).toHaveBeenCalledWith('test-room-id');
      expect(result).toBe(3);
    });
  });

  describe('Remove User From Room', () => {
    it('When the room does not exist, then a NotFoundException is thrown', async () => {
      const getRoomByRoomIdSpy = jest
        .spyOn(roomUseCase, 'getRoomByRoomId')
        .mockResolvedValueOnce(null);

      await expect(
        roomUserUseCase.removeUserFromRoom('test-user-id', 'nonexistent-room'),
      ).rejects.toThrow(NotFoundException);

      expect(getRoomByRoomIdSpy).toHaveBeenCalledWith('nonexistent-room');
    });

    it('When the room exists, then the user is removed from the room', async () => {
      jest
        .spyOn(roomUseCase, 'getRoomByRoomId')
        .mockResolvedValueOnce(createMock<Room>(mockRoomData));

      const deleteByUserIdAndRoomIdSpy = jest
        .spyOn(roomUserRepository, 'deleteByUserIdAndRoomId')
        .mockResolvedValueOnce(undefined);

      await roomUserUseCase.removeUserFromRoom('test-user-id', 'test-room-id');

      expect(deleteByUserIdAndRoomIdSpy).toHaveBeenCalledWith(
        'test-user-id',
        'test-room-id',
      );
    });
  });
});
