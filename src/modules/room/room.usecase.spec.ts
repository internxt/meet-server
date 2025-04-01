import { createMock, DeepMocked } from '@golevelup/ts-jest';
import { Test, TestingModule } from '@nestjs/testing';
import { RoomUseCase } from './room.usecase';
import { SequelizeRoomRepository } from './room.repository';
import { RoomModel } from './models/room.model';
import { mockRoomData } from '../call/fixtures';

describe('Room Use Cases', () => {
  let roomUseCase: RoomUseCase;
  let roomRepository: DeepMocked<SequelizeRoomRepository>;

  beforeEach(async () => {
    roomRepository = createMock<SequelizeRoomRepository>();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RoomUseCase,
        {
          provide: SequelizeRoomRepository,
          useValue: roomRepository,
        },
      ],
    }).compile();

    roomUseCase = module.get<RoomUseCase>(RoomUseCase);
  });

  describe('Creating a room', () => {
    it('should create a room successfully', async () => {
      const mockRoom = createMock<RoomModel>(mockRoomData);
      const createRoomSpy = jest
        .spyOn(roomRepository, 'create')
        .mockResolvedValueOnce(mockRoom);

      const result = await roomUseCase.createRoom(mockRoomData);

      expect(createRoomSpy).toHaveBeenCalledWith(mockRoomData);
      expect(result).toEqual(mockRoom);
    });
  });

  describe('getRoomByRoomId', () => {
    it('should return room when found', async () => {
      const mockRoom = createMock<RoomModel>(mockRoomData);
      const findRoomByIdSpy = jest
        .spyOn(roomRepository, 'findById')
        .mockResolvedValueOnce(mockRoom);

      const result = await roomUseCase.getRoomByRoomId(mockRoomData.id);

      expect(findRoomByIdSpy).toHaveBeenCalledWith(mockRoomData.id);
      expect(result).toEqual(mockRoom);
    });

    it('should return null when room not found', async () => {
      const findRoomByIdSpy = jest
        .spyOn(roomRepository, 'findById')
        .mockResolvedValueOnce(null);

      const result = await roomUseCase.getRoomByRoomId(mockRoomData.id);

      expect(findRoomByIdSpy).toHaveBeenCalledWith(mockRoomData.id);
      expect(result).toBeNull();
    });
  });

  describe('getRoomByHostId', () => {
    it('should return room when found', async () => {
      const mockRoom = createMock<RoomModel>(mockRoomData);
      const findRoomByHostIdSpy = jest
        .spyOn(roomRepository, 'findByHostId')
        .mockResolvedValueOnce(mockRoom);

      const result = await roomUseCase.getRoomByHostId(mockRoomData.host_id);

      expect(findRoomByHostIdSpy).toHaveBeenCalledWith(mockRoomData.host_id);
      expect(result).toEqual(mockRoom);
    });

    it('should return null when room not found', async () => {
      const findRoomByHostIdSpy = jest
        .spyOn(roomRepository, 'findByHostId')
        .mockResolvedValueOnce(null);

      const result = await roomUseCase.getRoomByHostId(mockRoomData.host_id);

      expect(findRoomByHostIdSpy).toHaveBeenCalledWith(mockRoomData.host_id);
      expect(result).toBeNull();
    });
  });

  describe('updateRoom', () => {
    const mockUpdateData = {
      max_users_allowed: 10,
    };

    it('should update room successfully', async () => {
      const mockUpdatedRoom = createMock<RoomModel>({
        ...mockRoomData,
        max_users_allowed: 10,
      });

      const updateRoomSpy = jest
        .spyOn(roomRepository, 'update')
        .mockResolvedValueOnce([1]);
      const findRoomByIdSpy = jest
        .spyOn(roomRepository, 'findById')
        .mockResolvedValueOnce(mockUpdatedRoom);

      const result = await roomUseCase.updateRoom(
        mockRoomData.id,
        mockUpdateData,
      );

      expect(updateRoomSpy).toHaveBeenCalledWith(
        mockRoomData.id,
        mockUpdateData,
      );
      expect(findRoomByIdSpy).toHaveBeenCalledWith(mockRoomData.id);
      expect(result).toEqual(mockUpdatedRoom);
    });
  });

  describe('removeRoom', () => {
    it('should remove room successfully', async () => {
      const deleteRoomSpy = jest
        .spyOn(roomRepository, 'delete')
        .mockResolvedValueOnce(1);

      await roomUseCase.removeRoom(mockRoomData.id);

      expect(deleteRoomSpy).toHaveBeenCalledWith(mockRoomData.id);
    });
  });
});
