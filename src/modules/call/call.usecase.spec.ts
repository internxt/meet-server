import { createMock } from '@golevelup/ts-jest';
import { Test, TestingModule } from '@nestjs/testing';
import { CallUseCase } from './call.usecase';
import { CallService } from './call.service';
import { RoomUseCase } from '../room/room.usecase';
import {
  BadRequestException,
  ConflictException,
  InternalServerErrorException,
} from '@nestjs/common';
import { mockCallResponse, mockRoomData, mockUserPayload } from './fixtures';
import { Room } from '../room/room.domain';

describe('CallUseCase', () => {
  let callUseCase: CallUseCase;
  let callService: CallService;
  let roomUseCase: RoomUseCase;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CallUseCase,
        {
          provide: CallService,
          useValue: {
            createCallToken: jest.fn(),
          },
        },
        {
          provide: RoomUseCase,
          useValue: {
            getRoomByHostId: jest.fn(),
            createRoom: jest.fn(),
          },
        },
      ],
    }).compile();

    callUseCase = module.get<CallUseCase>(CallUseCase);
    callService = module.get<CallService>(CallService);
    roomUseCase = module.get<RoomUseCase>(RoomUseCase);
  });

  describe('validateUserHasNoActiveRoom', () => {
    it('should not throw when user has no active room', async () => {
      const getRoomByHostIdSpy = jest.spyOn(roomUseCase, 'getRoomByHostId');
      getRoomByHostIdSpy.mockResolvedValueOnce(null);

      await expect(
        callUseCase.validateUserHasNoActiveRoom(
          mockUserPayload.uuid,
          mockUserPayload.email,
        ),
      ).resolves.not.toThrow();

      expect(getRoomByHostIdSpy).toHaveBeenCalledWith(mockUserPayload.uuid);
    });

    it('should throw ConflictException when user already has an active room', async () => {
      const getRoomByHostIdSpy = jest.spyOn(roomUseCase, 'getRoomByHostId');
      getRoomByHostIdSpy.mockResolvedValueOnce(createMock<Room>(mockRoomData));

      await expect(
        callUseCase.validateUserHasNoActiveRoom(
          mockUserPayload.uuid,
          mockUserPayload.email,
        ),
      ).rejects.toThrow(ConflictException);

      expect(getRoomByHostIdSpy).toHaveBeenCalledWith(mockUserPayload.uuid);
    });

    it('should throw InternalServerErrorException when an unexpected error occurs', async () => {
      const getRoomByHostIdSpy = jest.spyOn(roomUseCase, 'getRoomByHostId');
      getRoomByHostIdSpy.mockRejectedValueOnce(new Error('Database error'));

      await expect(
        callUseCase.validateUserHasNoActiveRoom(
          mockUserPayload.uuid,
          mockUserPayload.email,
        ),
      ).rejects.toThrow(InternalServerErrorException);

      expect(getRoomByHostIdSpy).toHaveBeenCalledWith(mockUserPayload.uuid);
    });
  });

  describe('createCallAndRoom', () => {
    it('should create a call token and room successfully', async () => {
      const createCallTokenSpy = jest.spyOn(callService, 'createCallToken');
      const createRoomForCallSpy = jest.spyOn(callUseCase, 'createRoomForCall');
      createCallTokenSpy.mockResolvedValueOnce(mockCallResponse);
      createRoomForCallSpy.mockResolvedValueOnce();

      const result = await callUseCase.createCallAndRoom(
        mockUserPayload.uuid,
        mockUserPayload.email,
      );

      expect(createCallTokenSpy).toHaveBeenCalledWith(mockUserPayload.uuid);
      expect(createRoomForCallSpy).toHaveBeenCalledWith(
        mockCallResponse,
        mockUserPayload.uuid,
        mockUserPayload.email,
      );
      expect(result).toEqual(mockCallResponse);
    });

    it('should propagate errors from call service', async () => {
      const createCallTokenSpy = jest.spyOn(callService, 'createCallToken');
      const error = new Error('Failed to create call');
      createCallTokenSpy.mockRejectedValueOnce(error);

      await expect(
        callUseCase.createCallAndRoom(
          mockUserPayload.uuid,
          mockUserPayload.email,
        ),
      ).rejects.toThrow(error);

      expect(createCallTokenSpy).toHaveBeenCalledWith(mockUserPayload.uuid);
    });
  });

  describe('createRoomForCall', () => {
    it('should create a room for the call successfully', async () => {
      const createRoomSpy = jest.spyOn(roomUseCase, 'createRoom');
      createRoomSpy.mockResolvedValueOnce(createMock<Room>(mockRoomData));

      await callUseCase.createRoomForCall(
        mockCallResponse,
        mockUserPayload.uuid,
        mockUserPayload.email,
      );

      expect(createRoomSpy).toHaveBeenCalledWith({
        id: mockCallResponse.room,
        hostId: mockUserPayload.uuid,
        maxUsersAllowed: mockCallResponse.paxPerCall,
      });
    });

    it('should throw ConflictException when room creation fails', async () => {
      const createRoomSpy = jest.spyOn(roomUseCase, 'createRoom');
      createRoomSpy.mockRejectedValueOnce(new Error('Room already exists'));

      await expect(
        callUseCase.createRoomForCall(
          mockCallResponse,
          mockUserPayload.uuid,
          mockUserPayload.email,
        ),
      ).rejects.toThrow(ConflictException);

      expect(createRoomSpy).toHaveBeenCalledWith({
        id: mockCallResponse.room,
        hostId: mockUserPayload.uuid,
        maxUsersAllowed: mockCallResponse.paxPerCall,
      });
    });
  });

  describe('handleError', () => {
    const context = {
      uuid: mockUserPayload.uuid,
      email: mockUserPayload.email,
    };

    it('should not throw for BadRequestException', () => {
      const error = new BadRequestException('Bad request');

      expect(() => {
        callUseCase.handleError(error, context);
      }).not.toThrow();
    });

    it('should not throw for ConflictException', () => {
      const error = new ConflictException('Conflict');

      expect(() => {
        callUseCase.handleError(error, context);
      }).not.toThrow();
    });

    it('should not throw for InternalServerErrorException', () => {
      const error = new InternalServerErrorException('Internal error');

      expect(() => {
        callUseCase.handleError(error, context);
      }).not.toThrow();
    });

    it('should throw InternalServerErrorException for unknown errors', () => {
      const error = new Error('Unknown error');

      expect(() => {
        callUseCase.handleError(error, context);
      }).toThrow(InternalServerErrorException);
    });
  });
});
