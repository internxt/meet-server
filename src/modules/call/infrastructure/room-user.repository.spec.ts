import { createMock, DeepMocked } from '@golevelup/ts-jest';
import { getModelToken } from '@nestjs/sequelize';
import { Test, TestingModule } from '@nestjs/testing';
import { RoomUser } from '../domain/room-user.domain';
import { RoomUserModel } from '../models/room-user.model';
import { SequelizeRoomUserRepository } from './room-user.repository';
import { v4 } from 'uuid';

describe('SequelizeRoomUserRepository', () => {
  let repository: SequelizeRoomUserRepository;
  let roomUserModel: DeepMocked<typeof RoomUserModel>;

  const mockRoomUserData = {
    id: v4(),
    roomId: 'test-room-id',
    userId: 'test-user-id',
    name: 'Test User',
    lastName: 'Smith',
    anonymous: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    roomUserModel = createMock<typeof RoomUserModel>();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SequelizeRoomUserRepository,
        {
          provide: getModelToken(RoomUserModel),
          useValue: roomUserModel,
        },
      ],
    }).compile();

    repository = module.get<SequelizeRoomUserRepository>(
      SequelizeRoomUserRepository,
    );
  });

  describe('Creating a RoomUser', () => {
    it('When a user joins a room, then the room user is inserted to the DB successfully', async () => {
      const mockRoomUser = createMock<RoomUserModel>(mockRoomUserData);

      const createRoomUserSpy = jest
        .spyOn(roomUserModel, 'create')
        .mockResolvedValueOnce(mockRoomUser);

      const roomUserCreateData = {
        roomId: 'test-room-id',
        userId: 'test-user-id',
        name: 'Test User',
        lastName: 'Smith',
        anonymous: false,
      };

      const result = await repository.create(roomUserCreateData);

      expect(createRoomUserSpy).toHaveBeenCalledWith(roomUserCreateData);
      expect(result).toBeInstanceOf(RoomUser);
      expect(result.id).toEqual(mockRoomUserData.id);
      expect(result.roomId).toEqual(mockRoomUserData.roomId);
    });
  });

  describe('Get RoomUser By Id', () => {
    it('When the room user exists in the DB, then it is returned successfully', async () => {
      const mockRoomUser = createMock<RoomUserModel>(mockRoomUserData);

      const findRoomUserByIdSpy = jest
        .spyOn(roomUserModel, 'findByPk')
        .mockResolvedValueOnce(mockRoomUser);

      const result = await repository.findById(1);

      expect(findRoomUserByIdSpy).toHaveBeenCalledWith(1);
      expect(result).toBeInstanceOf(RoomUser);
      expect(result?.id).toEqual(mockRoomUserData.id);
    });

    it('When the room user does not exist in the DB, then null is returned', async () => {
      const findRoomUserByIdSpy = jest
        .spyOn(roomUserModel, 'findByPk')
        .mockResolvedValueOnce(null);

      const result = await repository.findById(999);

      expect(findRoomUserByIdSpy).toHaveBeenCalledWith(999);
      expect(result).toBeNull();
    });
  });

  describe('Get RoomUser By User Id And Room Id', () => {
    it('When the room user exists in the DB, then it is returned successfully', async () => {
      const mockRoomUser = createMock<RoomUserModel>(mockRoomUserData);
      const findRoomUserSpy = jest
        .spyOn(roomUserModel, 'findOne')
        .mockResolvedValueOnce(mockRoomUser);

      const result = await repository.findByUserIdAndRoomId(
        'test-user-id',
        'test-room-id',
      );

      expect(findRoomUserSpy).toHaveBeenCalledWith({
        where: {
          userId: 'test-user-id',
          roomId: 'test-room-id',
        },
      });
      expect(result).toBeInstanceOf(RoomUser);
      expect(result?.userId).toEqual(mockRoomUserData.userId);
      expect(result?.roomId).toEqual(mockRoomUserData.roomId);
    });

    it('When the room user does not exist in the DB, then null is returned', async () => {
      const findRoomUserSpy = jest
        .spyOn(roomUserModel, 'findOne')
        .mockResolvedValueOnce(null);

      const result = await repository.findByUserIdAndRoomId(
        'nonexistent',
        'nonexistent',
      );

      expect(findRoomUserSpy).toHaveBeenCalledWith({
        where: {
          userId: 'nonexistent',
          roomId: 'nonexistent',
        },
      });
      expect(result).toBeNull();
    });
  });

  describe('Find All RoomUsers By Room Id', () => {
    it('When users exist in the room, then they are returned successfully', async () => {
      const mockRoomUsers = [
        createMock<RoomUserModel>(mockRoomUserData),
        createMock<RoomUserModel>({
          ...mockRoomUserData,
          id: v4(),
          userId: 'user-2',
        }),
      ];
      const findAllRoomUsersSpy = jest
        .spyOn(roomUserModel, 'findAll')
        .mockResolvedValueOnce(mockRoomUsers);

      const result = await repository.findAllByRoomId('test-room-id');

      expect(findAllRoomUsersSpy).toHaveBeenCalledWith({
        where: { roomId: 'test-room-id' },
      });
      expect(result).toHaveLength(2);
      expect(result[0]).toBeInstanceOf(RoomUser);
      expect(result[1]).toBeInstanceOf(RoomUser);
    });
  });

  describe('Count RoomUsers By Room Id', () => {
    it('When users exist in the room, then their count is returned successfully', async () => {
      const countRoomUsersSpy = jest
        .spyOn(roomUserModel, 'count')
        .mockResolvedValueOnce(5);

      const result = await repository.countByRoomId('test-room-id');

      expect(countRoomUsersSpy).toHaveBeenCalledWith({
        where: { roomId: 'test-room-id' },
      });
      expect(result).toEqual(5);
    });
  });

  describe('Update RoomUser', () => {
    it('When the room user exists in the DB, then it is updated successfully', async () => {
      const updateRoomUserSpy = jest
        .spyOn(roomUserModel, 'update')
        .mockResolvedValueOnce([1]);

      await repository.update(1, { name: 'Updated Name' });

      expect(updateRoomUserSpy).toHaveBeenCalledWith(
        { name: 'Updated Name' },
        { where: { id: 1 } },
      );
    });
  });

  describe('Delete RoomUser', () => {
    it('When the room user exists in the DB, then it is deleted successfully', async () => {
      const deleteRoomUserSpy = jest
        .spyOn(roomUserModel, 'destroy')
        .mockResolvedValueOnce(1);
      const roomUserId = v4();
      await repository.delete(roomUserId);

      expect(deleteRoomUserSpy).toHaveBeenCalledWith({
        where: { id: roomUserId },
      });
    });
  });

  describe('Delete RoomUser By User Id And Room Id', () => {
    it('When the room user exists in the DB, then it is deleted successfully', async () => {
      const deleteRoomUserSpy = jest
        .spyOn(roomUserModel, 'destroy')
        .mockResolvedValueOnce(1);

      await repository.deleteByUserIdAndRoomId('test-user-id', 'test-room-id');

      expect(deleteRoomUserSpy).toHaveBeenCalledWith({
        where: {
          userId: 'test-user-id',
          roomId: 'test-room-id',
        },
      });
    });
  });
});
