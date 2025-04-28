import { createMock, DeepMocked } from '@golevelup/ts-jest';
import { Test, TestingModule } from '@nestjs/testing';
import { RoomUseCase } from './room.usecase';
import { SequelizeRoomRepository } from './room.repository';
import { Room } from './room.domain';
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
      const mockRoom = createMock<Room>(mockRoomData);
      const createRoomSpy = jest
        .spyOn(roomRepository, 'create')
        .mockResolvedValueOnce(mockRoom);

      const result = await roomUseCase.createRoom(mockRoom);

      expect(createRoomSpy).toHaveBeenCalledWith(mockRoom);
      expect(result).toEqual(mockRoom);
    });
  });

  describe('getRoomByRoomId', () => {
    it('should return room when found', async () => {
      const mockRoom = createMock<Room>(mockRoomData);
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
      const mockRoom = createMock<Room>(mockRoomData);
      const findRoomByHostIdSpy = jest
        .spyOn(roomRepository, 'findByHostId')
        .mockResolvedValueOnce(mockRoom);

      const result = await roomUseCase.getRoomByHostId(mockRoomData.hostId);

      expect(findRoomByHostIdSpy).toHaveBeenCalledWith(mockRoomData.hostId);
      expect(result).toEqual(mockRoom);
    });

    it('should return null when room not found', async () => {
      const findRoomByHostIdSpy = jest
        .spyOn(roomRepository, 'findByHostId')
        .mockResolvedValueOnce(null);

      const result = await roomUseCase.getRoomByHostId(mockRoomData.hostId);

      expect(findRoomByHostIdSpy).toHaveBeenCalledWith(mockRoomData.hostId);
      expect(result).toBeNull();
    });
  });

  describe('updateRoom', () => {
    const mockUpdateData = {
      maxUsersAllowed: 10,
    };

    it('should update room successfully', async () => {
      const mockUpdatedRoom = createMock<Room>({
        ...mockRoomData,
        maxUsersAllowed: 10,
      });

      const updateRoomSpy = jest
        .spyOn(roomRepository, 'update')
        .mockResolvedValueOnce();
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
        .mockResolvedValueOnce();

      await roomUseCase.removeRoom(mockRoomData.id);

      expect(deleteRoomSpy).toHaveBeenCalledWith(mockRoomData.id);
    });
  });

  describe('closeRoom', () => {
    it('should set isClosed to true', async () => {
      const updateSpy = jest
        .spyOn(roomRepository, 'update')
        .mockResolvedValueOnce();
      const roomId = mockRoomData.id;
      await roomUseCase.closeRoom(roomId);
      expect(updateSpy).toHaveBeenCalledWith(roomId, { isClosed: true });
    });
  });

  describe('openRoom', () => {
    it('should set isClosed to false', async () => {
      const updateSpy = jest
        .spyOn(roomRepository, 'update')
        .mockResolvedValueOnce();
      const roomId = mockRoomData.id;
      await roomUseCase.openRoom(roomId);
      expect(updateSpy).toHaveBeenCalledWith(roomId, { isClosed: false });
    });
  });

  describe('getOpenRoomByHostId', () => {
    it('should return room when found', async () => {
      const mockRoom = createMock<Room>(mockRoomData);
      const findRoomByHostIdSpy = jest
        .spyOn(roomRepository, 'findByHostId')
        .mockResolvedValueOnce(mockRoom);

      const result = await roomUseCase.getOpenRoomByHostId(mockRoomData.hostId);

      expect(findRoomByHostIdSpy).toHaveBeenCalledWith(mockRoomData.hostId, {
        isClosed: false,
      });
      expect(result).toEqual(mockRoom);
    });

    it('should return null when room not found', async () => {
      const findRoomByHostIdSpy = jest
        .spyOn(roomRepository, 'findByHostId')
        .mockResolvedValueOnce(null);

      const result = await roomUseCase.getOpenRoomByHostId(mockRoomData.hostId);

      expect(findRoomByHostIdSpy).toHaveBeenCalledWith(mockRoomData.hostId, {
        isClosed: false,
      });
      expect(result).toBeNull();
    });
  });
});
