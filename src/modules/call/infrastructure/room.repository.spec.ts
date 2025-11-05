import { createMock, DeepMocked } from '@golevelup/ts-jest';
import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/sequelize';
import { RoomModel } from '../models/room.model';
import { SequelizeRoomRepository } from './room.repository';
import { mockRoomData } from '../fixtures';
import { v4 } from 'uuid';

describe('SequelizeRoomRepository', () => {
  let roomRepository: SequelizeRoomRepository;
  let roomModel: DeepMocked<typeof RoomModel>;

  beforeEach(async () => {
    roomModel = createMock<typeof RoomModel>();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SequelizeRoomRepository,
        {
          provide: getModelToken(RoomModel),
          useValue: roomModel,
        },
      ],
    }).compile();

    roomRepository = module.get<SequelizeRoomRepository>(
      SequelizeRoomRepository,
    );
  });

  describe('Creating a Room', () => {
    it('When the user has no active room, then the room is inserted to the DB successfully', async () => {
      const mockRoom = createMock<RoomModel>(mockRoomData);
      const createRoomSpy = jest
        .spyOn(roomModel, 'create')
        .mockResolvedValueOnce(mockRoom);

      const result = await roomRepository.create(mockRoom);

      expect(createRoomSpy).toHaveBeenCalledWith(mockRoom);
      expect(result).toEqual(mockRoom);
    });
  });

  describe('Get Room By Id', () => {
    it('When the room exists in the DB, then it is returned successfully', async () => {
      const mockRoom = createMock<RoomModel>(mockRoomData);
      const findRoomByIdSpy = jest
        .spyOn(roomModel, 'findByPk')
        .mockResolvedValueOnce(mockRoom);

      const result = await roomRepository.findById(mockRoomData.id);

      expect(findRoomByIdSpy).toHaveBeenCalledWith(mockRoomData.id);
      expect(result).toEqual(mockRoom);
    });

    it('When the room does not exist in the DB, then null is returned', async () => {
      const findRoomByIdSpy = jest
        .spyOn(roomModel, 'findByPk')
        .mockResolvedValueOnce(null);

      const result = await roomRepository.findById(mockRoomData.id);

      expect(findRoomByIdSpy).toHaveBeenCalledWith(mockRoomData.id);
      expect(result).toBeNull();
    });
  });

  describe('Get Room By Host Id', () => {
    it('When the room exists in the DB by host id, then it is returned successfully', async () => {
      const mockRoom = createMock<RoomModel>(mockRoomData);
      const findRoomByHostIdSpy = jest
        .spyOn(roomModel, 'findOne')
        .mockResolvedValueOnce(mockRoom);

      const result = await roomRepository.findByHostId(mockRoomData.hostId);

      expect(findRoomByHostIdSpy).toHaveBeenCalledWith({
        where: { hostId: mockRoomData.hostId },
      });
      expect(result).toEqual(mockRoom);
    });

    it('When the room does not exist in the DB by host id, then null is returned', async () => {
      const findRoomByHostIdSpy = jest
        .spyOn(roomModel, 'findOne')
        .mockResolvedValueOnce(null);

      const result = await roomRepository.findByHostId(mockRoomData.hostId);

      expect(findRoomByHostIdSpy).toHaveBeenCalledWith({
        where: { hostId: mockRoomData.hostId },
      });
      expect(result).toBeNull();
    });

    it('When the room exists in the DB by host id and additional where, then it is returned successfully', async () => {
      const mockRoom = createMock<RoomModel>(mockRoomData);
      const findRoomByHostIdSpy = jest
        .spyOn(roomModel, 'findOne')
        .mockResolvedValueOnce(mockRoom);

      const result = await roomRepository.findByHostId(mockRoomData.hostId, {
        isClosed: false,
      });

      expect(findRoomByHostIdSpy).toHaveBeenCalledWith({
        where: { hostId: mockRoomData.hostId, isClosed: false },
      });
      expect(result).toEqual(mockRoom);
    });
  });

  describe('Update Room', () => {
    const mockUpdateData = {
      maxUsersAllowed: 10,
    };

    it('When the room exists in the DB, then it is updated successfully', async () => {
      const updateRoomSpy = jest
        .spyOn(roomModel, 'update')
        .mockResolvedValueOnce([1]);

      await roomRepository.update(mockRoomData.id, mockUpdateData);

      expect(updateRoomSpy).toHaveBeenCalledWith(mockUpdateData, {
        where: { id: mockRoomData.id },
      });
    });
  });

  describe('Remove Room', () => {
    it('When the room exists in the DB, then it is removed successfully', async () => {
      const deleteRoomSpy = jest
        .spyOn(roomModel, 'destroy')
        .mockResolvedValueOnce(1);

      await roomRepository.delete(mockRoomData.id);

      expect(deleteRoomSpy).toHaveBeenCalledWith({
        where: { id: mockRoomData.id },
      });
    });
  });

  describe('getUserOwnedRoomsCount', () => {
    it('When counting scheduled rooms, then it should call count with correct where clause', async () => {
      const userUuid = v4();
      const expectedCount = 25;
      const countSpy = jest
        .spyOn(roomModel, 'count')
        .mockResolvedValueOnce(expectedCount);

      const result = await roomRepository.getUserOwnedRoomsCount(
        userUuid,
        true,
      );

      expect(countSpy).toHaveBeenCalledWith({
        where: { hostId: userUuid, scheduled: true },
      });
      expect(result).toBe(expectedCount);
    });

    it('When counting non-scheduled rooms, then it should call count with correct where clause', async () => {
      const userUuid = v4();
      const expectedCount = 35;
      const countSpy = jest
        .spyOn(roomModel, 'count')
        .mockResolvedValueOnce(expectedCount);

      const result = await roomRepository.getUserOwnedRoomsCount(
        userUuid,
        false,
      );

      expect(countSpy).toHaveBeenCalledWith({
        where: { hostId: userUuid, scheduled: false },
      });
      expect(result).toBe(expectedCount);
    });
  });

  describe('getUserOldestRoom', () => {
    it('When getting oldest scheduled room, then it should call findOne with correct where and order', async () => {
      const userUuid = v4();
      const mockRoom = createMock<RoomModel>({
        ...mockRoomData,
        scheduled: true,
      });
      const findOneSpy = jest
        .spyOn(roomModel, 'findOne')
        .mockResolvedValueOnce(mockRoom);

      const result = await roomRepository.getUserOldestRoom(userUuid, true);

      expect(findOneSpy).toHaveBeenCalledWith({
        where: { hostId: userUuid, scheduled: true },
        order: [['createdAt', 'ASC']],
      });
      expect(result).toEqual(mockRoom);
    });

    it('When getting oldest non-scheduled room, then it should call findOne with correct where and order', async () => {
      const userUuid = 'test-user-uuid';
      const mockRoom = createMock<RoomModel>({
        ...mockRoomData,
        scheduled: false,
      });
      const findOneSpy = jest
        .spyOn(roomModel, 'findOne')
        .mockResolvedValueOnce(mockRoom);

      const result = await roomRepository.getUserOldestRoom(userUuid, false);

      expect(findOneSpy).toHaveBeenCalledWith({
        where: { hostId: userUuid, scheduled: false },
        order: [['createdAt', 'ASC']],
      });
      expect(result).toEqual(mockRoom);
    });

    it('When no rooms exist for user, then it should return null', async () => {
      const userUuid = v4();
      jest.spyOn(roomModel, 'findOne').mockResolvedValueOnce(null);

      const result = await roomRepository.getUserOldestRoom(userUuid, true);

      expect(result).toBeNull();
    });
  });
});
