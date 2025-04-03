import { createMock, DeepMocked } from '@golevelup/ts-jest';
import { Test, TestingModule } from '@nestjs/testing';
import { SequelizeRoomRepository } from './room.repository';
import { RoomModel } from './models/room.model';
import { getModelToken } from '@nestjs/sequelize';
import { mockRoomData } from '../call/fixtures';

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
});
