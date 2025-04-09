/* eslint-disable @typescript-eslint/unbound-method */
import { createMock, DeepMocked } from '@golevelup/ts-jest';
import { Test, TestingModule } from '@nestjs/testing';
import { CallController } from './call.controller';
import { CallUseCase } from './call.usecase';
import {
  BadRequestException,
  ConflictException,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { createMockUserToken } from './fixtures';
import { RoomUserUseCase } from '../room/room-user.usecase';
import { UsersInRoomDto } from '../room/dto/users-in-room.dto';

describe('Testing Call Endpoints', () => {
  let callController: CallController;
  let callUseCase: DeepMocked<CallUseCase>;
  let roomUserUseCase: DeepMocked<RoomUserUseCase>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CallController],
      providers: [
        {
          provide: CallUseCase,
          useValue: createMock<CallUseCase>(),
        },
        {
          provide: RoomUserUseCase,
          useValue: createMock<RoomUserUseCase>(),
        },
      ],
    }).compile();

    callController = module.get<CallController>(CallController);
    callUseCase = module.get<DeepMocked<CallUseCase>>(CallUseCase);
    roomUserUseCase = module.get<DeepMocked<RoomUserUseCase>>(RoomUserUseCase);
  });

  describe('Creating a call', () => {
    it('When the user id is not provided (uuid), then an error indicating so is thrown', async () => {
      await expect(
        callController.createCall(
          createMockUserToken({
            payload: { ...createMockUserToken().payload, uuid: undefined },
          }).payload,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('When the user id exists and has meet enabled, then should create the call and the room', async () => {
      const mockUserToken = createMockUserToken();
      const mockResponse = {
        token: 'test-token',
        room: 'room-123',
        paxPerCall: 5,
      };

      callUseCase.validateUserHasNoActiveRoom.mockResolvedValueOnce(undefined);
      callUseCase.createCallAndRoom.mockResolvedValueOnce(mockResponse);

      const result = await callController.createCall(mockUserToken.payload);

      expect(callUseCase.validateUserHasNoActiveRoom).toHaveBeenCalledWith(
        mockUserToken.payload.uuid,
        mockUserToken.payload.email,
      );
      expect(callUseCase.createCallAndRoom).toHaveBeenCalledWith(
        mockUserToken.payload.uuid,
        mockUserToken.payload.email,
      );
      expect(result).toEqual(mockResponse);
    });

    it('When the room already exists, then an error indicating so is thrown', async () => {
      const mockUserToken = createMockUserToken();

      callUseCase.validateUserHasNoActiveRoom.mockRejectedValueOnce(
        new ConflictException('User already has an active room as host'),
      );

      await expect(
        callController.createCall(mockUserToken.payload),
      ).rejects.toThrow(ConflictException);
    });

    it('When an unexpected error occurs, then an error indicating so is thrown', async () => {
      const mockUserToken = createMockUserToken();

      callUseCase.validateUserHasNoActiveRoom.mockRejectedValueOnce(
        new Error('Unexpected error'),
      );

      await expect(
        callController.createCall(mockUserToken.payload),
      ).rejects.toThrow(InternalServerErrorException);
    });
  });

  describe('Joining a call', () => {
    const roomId = 'test-room-id';

    it('When joining a call successfully, it should return the join call response', async () => {
      const mockUserToken = createMockUserToken();
      const mockJoinCallDto = {
        name: 'Test User',
        lastName: 'Last Name',
        anonymous: false,
      };

      const mockJoinCallResponse = {
        token: 'join-token',
        room: roomId,
        userId: mockUserToken.payload.uuid,
      };

      callUseCase.joinCall.mockResolvedValueOnce(mockJoinCallResponse);

      const result = await callController.joinCall(
        roomId,
        mockUserToken.payload,
        mockJoinCallDto,
      );

      expect(callUseCase.joinCall).toHaveBeenCalledWith(roomId, {
        userId: mockUserToken.payload.uuid,
        name: mockJoinCallDto.name,
        lastName: mockJoinCallDto.lastName,
        anonymous: mockJoinCallDto.anonymous,
      });
      expect(result).toEqual(mockJoinCallResponse);
    });

    it('When joining a call anonymously, it should pass the anonymous flag', async () => {
      const mockUserToken = createMockUserToken();
      const mockJoinCallDto = {
        name: 'Anonymous',
        anonymous: true,
      };

      const mockJoinCallResponse = {
        token: 'anon-token',
        room: roomId,
        userId: 'generated-uuid',
      };

      callUseCase.joinCall.mockResolvedValueOnce(mockJoinCallResponse);

      const result = await callController.joinCall(
        roomId,
        mockUserToken.payload,
        mockJoinCallDto,
      );

      expect(callUseCase.joinCall).toHaveBeenCalledWith(roomId, {
        userId: mockUserToken.payload.uuid,
        name: mockJoinCallDto.name,
        lastName: undefined,
        anonymous: true,
      });
      expect(result).toEqual(mockJoinCallResponse);
    });

    it('When the room is not found, it should throw NotFoundException', async () => {
      const mockUserToken = createMockUserToken();

      callUseCase.joinCall.mockRejectedValueOnce(
        new NotFoundException('Specified room not found'),
      );

      await expect(
        callController.joinCall(roomId, mockUserToken.payload),
      ).rejects.toThrow(NotFoundException);
    });

    it('When user is already in room, it should throw ConflictException', async () => {
      const mockUserToken = createMockUserToken();

      callUseCase.joinCall.mockRejectedValueOnce(
        new ConflictException('User is already in this room'),
      );

      await expect(
        callController.joinCall(roomId, mockUserToken.payload),
      ).rejects.toThrow(ConflictException);
    });

    it('When room is full, it should throw BadRequestException', async () => {
      const mockUserToken = createMockUserToken();

      callUseCase.joinCall.mockRejectedValueOnce(
        new BadRequestException('Room is at maximum capacity'),
      );

      await expect(
        callController.joinCall(roomId, mockUserToken.payload),
      ).rejects.toThrow(BadRequestException);
    });

    it('When an unexpected error occurs, it should propagate the error', async () => {
      const mockUserToken = createMockUserToken();

      callUseCase.joinCall.mockRejectedValueOnce(new Error('Unexpected error'));

      await expect(
        callController.joinCall(roomId, mockUserToken.payload),
      ).rejects.toThrow(Error);
    });

    it('When joining without a JoinCallDto, it should use default values', async () => {
      const mockUserToken = createMockUserToken();

      const mockJoinCallResponse = {
        token: 'default-token',
        room: roomId,
        userId: mockUserToken.payload.uuid,
      };

      callUseCase.joinCall.mockResolvedValueOnce(mockJoinCallResponse);

      const result = await callController.joinCall(
        roomId,
        mockUserToken.payload,
      );

      expect(callUseCase.joinCall).toHaveBeenCalledWith(roomId, {
        userId: mockUserToken.payload.uuid,
        name: undefined,
        lastName: undefined,
        anonymous: undefined,
      });
      expect(result).toEqual(mockJoinCallResponse);
    });
  });

  describe('Getting users in a call', () => {
    const roomId = 'test-room-id';

    it('When getting users in a call successfully, it should return the users list', async () => {
      const mockUsers: UsersInRoomDto[] = [
        {
          id: 'user-id-1',
          name: 'Test User 1',
          lastName: 'Last Name 1',
          anonymous: false,
          avatar: 'avatar-url-1',
        },
        {
          id: 'user-id-2',
          name: 'Test User 2',
          lastName: 'Last Name 2',
          anonymous: false,
          avatar: 'avatar-url-2',
        },
      ];

      roomUserUseCase.getUsersInRoom.mockResolvedValueOnce(mockUsers);

      const result = await callController.getUsersInCall(roomId);

      expect(roomUserUseCase.getUsersInRoom).toHaveBeenCalledWith(roomId);
      expect(result).toEqual(mockUsers);
      expect(result.length).toBe(2);
    });

    it('When the room is not found, it should propagate NotFoundException', async () => {
      roomUserUseCase.getUsersInRoom.mockRejectedValueOnce(
        new NotFoundException('Specified room not found'),
      );

      await expect(callController.getUsersInCall(roomId)).rejects.toThrow(
        NotFoundException,
      );
      expect(roomUserUseCase.getUsersInRoom).toHaveBeenCalledWith(roomId);
    });

    it('When an unexpected error occurs, it should propagate the error', async () => {
      roomUserUseCase.getUsersInRoom.mockRejectedValueOnce(
        new Error('Unexpected error'),
      );

      await expect(callController.getUsersInCall(roomId)).rejects.toThrow(
        Error,
      );
      expect(roomUserUseCase.getUsersInRoom).toHaveBeenCalledWith(roomId);
    });

    it('When no users are in the room, it should return an empty array', async () => {
      roomUserUseCase.getUsersInRoom.mockResolvedValueOnce([]);

      const result = await callController.getUsersInCall(roomId);

      expect(roomUserUseCase.getUsersInRoom).toHaveBeenCalledWith(roomId);
      expect(result).toEqual([]);
      expect(result.length).toBe(0);
    });
  });
});
