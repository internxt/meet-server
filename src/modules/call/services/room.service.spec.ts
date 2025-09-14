import { createMock } from '@golevelup/ts-jest';
import { Test, TestingModule } from '@nestjs/testing';
import { RoomService } from './room.service';
import { SequelizeRoomRepository } from '../infrastructure/room.repository';
import { Room } from '../domain/room.domain';
import { mockRoomData } from '../fixtures';

describe('Room Service', () => {
  let roomService: RoomService;
  let roomRepository: SequelizeRoomRepository;
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
  });

  describe('Creating a room', () => {
    it('should create a room successfully', async () => {
      const mockRoom = createMock<Room>(mockRoomData);
      jest.spyOn(roomRepository, 'create').mockResolvedValueOnce(mockRoom);

      const result = await roomService.createRoom(mockRoom);

      expect(roomRepository.create).toHaveBeenCalledWith(mockRoom);
      expect(result).toEqual(mockRoom);
    });
  });

  describe('getRoomByRoomId', () => {
    it('should return room when found', async () => {
      const mockRoom = createMock<Room>(mockRoomData);
      jest.spyOn(roomRepository, 'findById').mockResolvedValueOnce(mockRoom);

      const result = await roomService.getRoomByRoomId(mockRoomData.id);

      expect(roomRepository.findById).toHaveBeenCalledWith(mockRoomData.id);
      expect(result).toEqual(mockRoom);
    });

    it('should return null when room not found', async () => {
      jest.spyOn(roomRepository, 'findById').mockResolvedValueOnce(null);

      const result = await roomService.getRoomByRoomId(mockRoomData.id);

      expect(roomRepository.findById).toHaveBeenCalledWith(mockRoomData.id);
      expect(result).toBeNull();
    });
  });

  describe('getRoomByHostId', () => {
    it('should return room when found', async () => {
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

    it('should return null when room not found', async () => {
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

    it('should update room successfully', async () => {
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
    it('should remove room successfully', async () => {
      jest.spyOn(roomRepository, 'delete').mockResolvedValueOnce();

      await roomService.removeRoom(mockRoomData.id);

      expect(roomRepository.delete).toHaveBeenCalledWith(mockRoomData.id);
    });
  });

  describe('closeRoom', () => {
    it('should set isClosed to true', async () => {
      jest.spyOn(roomRepository, 'update').mockResolvedValueOnce();
      const roomId = mockRoomData.id;
      await roomService.closeRoom(roomId);
      expect(roomRepository.update).toHaveBeenCalledWith(roomId, {
        isClosed: true,
      });
    });
  });

  describe('openRoom', () => {
    it('should set isClosed to false', async () => {
      jest.spyOn(roomRepository, 'update').mockResolvedValueOnce();
      const roomId = mockRoomData.id;
      await roomService.openRoom(roomId);
      expect(roomRepository.update).toHaveBeenCalledWith(roomId, {
        isClosed: false,
      });
    });
  });

  describe('getOpenRoomByHostId', () => {
    it('should return room when found', async () => {
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

    it('should return null when room not found', async () => {
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
});
