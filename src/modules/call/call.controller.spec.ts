import { createMock, DeepMocked } from '@golevelup/ts-jest';
import {
  BadRequestException,
  ConflictException,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { UsersInRoomDto } from './dto/users-in-room.dto';
import { RoomService } from './services/room.service';
import { CallController } from './call.controller';
import { CallUseCase } from './call.usecase';
import { JoinCallDto, JoinCallResponseDto } from './dto/join-call.dto';
import { LeaveCallDto } from './dto/leave-call.dto';
import { createMockUserToken, mockUserPayload } from './fixtures';
import { v4 } from 'uuid';

describe('Testing Call Endpoints', () => {
  let callController: CallController;
  let callUseCase: DeepMocked<CallUseCase>;
  let roomService: DeepMocked<RoomService>;

  const mockRoomId = v4();
  const mockJoinCallDto: JoinCallDto = {
    name: 'Test User',
    lastName: 'Smith',
    anonymous: false,
  };
  const mockJoinCallResponse: JoinCallResponseDto = {
    token: 'mock-token',
    room: mockRoomId,
    userId: 'user-id',
    appId: 'jitsi-app-id',
  };
  const mockUsersInRoom: UsersInRoomDto[] = [
    {
      id: 'user-1',
      name: 'User 1',
      lastName: 'One',
      anonymous: false,
      avatar: 'avatar-url-1',
    },
    {
      id: 'user-2',
      name: 'User 2',
      lastName: 'Two',
      anonymous: true,
      avatar: 'avatar-url-2',
    },
  ];

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CallController],
    })
      .setLogger(createMock())
      .useMocker(createMock)
      .compile();

    callController = module.get<CallController>(CallController);
    callUseCase = module.get<DeepMocked<CallUseCase>>(CallUseCase);
    roomService = module.get<DeepMocked<RoomService>>(RoomService);
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
        appId: 'jitsi-app-id',
      };

      callUseCase.createCallAndRoom.mockResolvedValueOnce(mockResponse);

      const result = await callController.createCall(mockUserToken.payload);

      expect(callUseCase.createCallAndRoom).toHaveBeenCalledWith(
        mockUserToken.payload,
      );
      expect(result).toEqual(mockResponse);
    });

    it('When the room already exists, then an error indicating so is thrown', async () => {
      const mockUserToken = createMockUserToken();

      callUseCase.createCallAndRoom.mockRejectedValueOnce(
        new ConflictException('User already has an active room as host'),
      );

      await expect(
        callController.createCall(mockUserToken.payload),
      ).rejects.toThrow(ConflictException);
    });

    it('When an unexpected error occurs, then an error indicating so is thrown', async () => {
      const mockUserToken = createMockUserToken();

      callUseCase.createCallAndRoom.mockRejectedValueOnce(
        new Error('Unexpected error'),
      );

      await expect(
        callController.createCall(mockUserToken.payload),
      ).rejects.toThrow(InternalServerErrorException);
    });
  });

  describe('Joining a call', () => {
    it('When joining a call with authenticated user, then it should join successfully', async () => {
      callUseCase.joinCall.mockResolvedValue(mockJoinCallResponse);

      const user = mockUserPayload;
      const result = await callController.joinCall(
        mockRoomId,
        user,
        mockJoinCallDto,
      );

      expect(result).toEqual(mockJoinCallResponse);
      expect(callUseCase.joinCall).toHaveBeenCalledWith(mockRoomId, {
        userId: user.uuid,
        email: user.email,
        name: mockJoinCallDto.name,
        lastName: mockJoinCallDto.lastName,
        anonymous: mockJoinCallDto.anonymous,
      });
    });

    it('When joining a call with anonymous user (no JWT), then it should join successfully', async () => {
      callUseCase.joinCall.mockResolvedValue(mockJoinCallResponse);

      const result = await callController.joinCall(
        mockRoomId,
        null,
        mockJoinCallDto,
      );

      expect(result).toEqual(mockJoinCallResponse);
      expect(callUseCase.joinCall).toHaveBeenCalledWith(mockRoomId, {
        userId: undefined,
        email: undefined,
        name: mockJoinCallDto.name,
        lastName: mockJoinCallDto.lastName,
        anonymous: true,
        anonymousId: undefined,
      });
    });

    it('When anonymous flag is explicitly set, then user should join as anonymous', async () => {
      callUseCase.joinCall.mockResolvedValue(mockJoinCallResponse);

      const anonymousDto = { ...mockJoinCallDto, anonymous: true };
      const user = mockUserPayload;

      const result = await callController.joinCall(
        mockRoomId,
        user,
        anonymousDto,
      );

      expect(result).toEqual(mockJoinCallResponse);
      expect(callUseCase.joinCall).toHaveBeenCalledWith(mockRoomId, {
        userId: user.uuid,
        name: anonymousDto.name,
        lastName: anonymousDto.lastName,
        anonymous: true,
        email: mockUserPayload.email,
      });
    });

    it('When the room is not found, it should throw NotFoundException', async () => {
      const mockUserToken = createMockUserToken();

      callUseCase.joinCall.mockRejectedValueOnce(
        new NotFoundException('Specified room not found'),
      );

      await expect(
        callController.joinCall(
          mockRoomId,
          mockUserToken.payload,
          mockJoinCallDto,
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('When user is already in room, it should throw ConflictException', async () => {
      const mockUserToken = createMockUserToken();

      callUseCase.joinCall.mockRejectedValueOnce(
        new ConflictException('User is already in this room'),
      );

      await expect(
        callController.joinCall(
          mockRoomId,
          mockUserToken.payload,
          mockJoinCallDto,
        ),
      ).rejects.toThrow(ConflictException);
    });

    it('When room is full, it should throw BadRequestException', async () => {
      const mockUserToken = createMockUserToken();

      callUseCase.joinCall.mockRejectedValueOnce(
        new BadRequestException('Room is at maximum capacity'),
      );

      await expect(
        callController.joinCall(
          mockRoomId,
          mockUserToken.payload,
          mockJoinCallDto,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('When an unexpected error occurs, it should propagate the error', async () => {
      const mockUserToken = createMockUserToken();

      callUseCase.joinCall.mockRejectedValueOnce(new Error('Unexpected error'));

      await expect(
        callController.joinCall(
          mockRoomId,
          mockUserToken.payload,
          mockJoinCallDto,
        ),
      ).rejects.toThrow(Error);
    });

    it('When joining without a JoinCallDto, it should use default values', async () => {
      const mockUserToken = createMockUserToken();
      const mockJoinCallResponse = {
        token: 'default-token',
        room: mockRoomId,
        userId: mockUserToken.payload.uuid,
        appId: 'vpaaS-magic-cookie-b6c3adeead3f12f2bdb7e123123e8',
      };

      callUseCase.joinCall.mockResolvedValueOnce(mockJoinCallResponse);

      const result = await callController.joinCall(
        mockRoomId,
        mockUserToken.payload,
      );

      expect(callUseCase.joinCall).toHaveBeenCalledWith(mockRoomId, {
        userId: mockUserToken.payload.uuid,
        email: mockUserToken.payload.email,
        name: undefined,
        lastName: undefined,
        anonymous: false,
      });
      expect(result).toEqual(mockJoinCallResponse);
    });

    it('When joining a call with invalid room name (not UUID), then it should throw', async () => {
      callUseCase.joinCall.mockResolvedValue(mockJoinCallResponse);

      await expect(
        callController.joinCall('invalid room name', null, mockJoinCallDto),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('Getting users in a call', () => {
    it('When getting users in a call for authenticated user, then it should return users list', async () => {
      roomService.getUsersInRoom.mockResolvedValue(mockUsersInRoom);

      const result = await callController.getUsersInCall(mockRoomId);

      expect(result).toEqual(mockUsersInRoom);
      expect(roomService.getUsersInRoom).toHaveBeenCalledWith(mockRoomId);
    });

    it('When getting users in a call for anonymous user, then it should return users list', async () => {
      roomService.getUsersInRoom.mockResolvedValue(mockUsersInRoom);

      const result = await callController.getUsersInCall(mockRoomId);

      expect(result).toEqual(mockUsersInRoom);
      expect(roomService.getUsersInRoom).toHaveBeenCalledWith(mockRoomId);
    });

    it('When the room is not found, it should propagate NotFoundException', async () => {
      roomService.getUsersInRoom.mockRejectedValue(
        new NotFoundException('Specified room not found'),
      );

      await expect(callController.getUsersInCall(mockRoomId)).rejects.toThrow(
        NotFoundException,
      );
      expect(roomService.getUsersInRoom).toHaveBeenCalledWith(mockRoomId);
    });

    it('When an unexpected error occurs, it should propagate the error', async () => {
      roomService.getUsersInRoom.mockRejectedValue(
        new Error('Unexpected error'),
      );

      await expect(callController.getUsersInCall(mockRoomId)).rejects.toThrow(
        Error,
      );
      expect(roomService.getUsersInRoom).toHaveBeenCalledWith(mockRoomId);
    });

    it('When no users are in the room, then it should return an empty array', async () => {
      roomService.getUsersInRoom.mockResolvedValue([]);

      const result = await callController.getUsersInCall(mockRoomId);

      expect(roomService.getUsersInRoom).toHaveBeenCalledWith(mockRoomId);
      expect(result).toEqual([]);
      expect(result.length).toBe(0);
    });
  });

  describe('Leaving a call', () => {
    it('When leaving a call for authenticated user, then it should leave successfully', async () => {
      callUseCase.leaveCall.mockResolvedValue();

      const result = await callController.leaveCall(
        mockRoomId,
        mockUserPayload,
      );

      expect(result).toBeUndefined();
      expect(callUseCase.leaveCall).toHaveBeenCalledWith(
        mockRoomId,
        mockUserPayload.uuid,
      );
    });

    it('When user is anonymous, then it should call leaveCall with userId from DTO', async () => {
      const anonymousUserId = 'anonymous-user-id';
      const leaveCallDto = new LeaveCallDto();
      leaveCallDto.userId = anonymousUserId;

      callUseCase.leaveCall.mockResolvedValue();

      await callController.leaveCall(mockRoomId, null, leaveCallDto);

      expect(callUseCase.leaveCall).toHaveBeenCalledWith(
        mockRoomId,
        anonymousUserId,
      );
    });

    it('When both authenticated user and DTO are provided, then it should prioritize user UUID', async () => {
      const leaveCallDto = new LeaveCallDto();
      leaveCallDto.userId = 'anonymous-user-id';

      callUseCase.leaveCall.mockResolvedValue();

      const userToken = createMockUserToken();
      await callController.leaveCall(
        mockRoomId,
        userToken.payload,
        leaveCallDto,
      );

      expect(callUseCase.leaveCall).toHaveBeenCalledWith(
        mockRoomId,
        userToken.payload.uuid,
      );
    });

    it('When neither authenticated user nor DTO with userId are provided, then it should pass undefined', async () => {
      const emptyDto = new LeaveCallDto();
      callUseCase.leaveCall.mockResolvedValue();

      await callController.leaveCall(mockRoomId, null, emptyDto);

      expect(callUseCase.leaveCall).toHaveBeenCalledWith(mockRoomId, undefined);
    });

    it('When room is not found, then it should propagate NotFoundException', async () => {
      const userToken = createMockUserToken();

      callUseCase.leaveCall.mockRejectedValue(
        new NotFoundException('Specified room not found'),
      );

      await expect(
        callController.leaveCall(mockRoomId, userToken.payload),
      ).rejects.toThrow(NotFoundException);
    });

    it('When no userId is provided, then it should propagate BadRequestException', async () => {
      callUseCase.leaveCall.mockRejectedValue(
        new BadRequestException('User ID is required'),
      );

      await expect(callController.leaveCall(mockRoomId, null)).rejects.toThrow(
        BadRequestException,
      );
    });
  });
});
