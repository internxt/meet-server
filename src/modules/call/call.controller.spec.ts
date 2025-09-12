import { createMock, DeepMocked } from '@golevelup/ts-jest';
import {
  BadRequestException,
  ConflictException,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { UsersInRoomDto } from '../room/dto/users-in-room.dto';
import { RoomUserUseCase } from '../room/room-user.usecase';
import { CallController } from './call.controller';
import { CallUseCase } from './call.usecase';
import { JoinCallDto, JoinCallResponseDto } from './dto/join-call.dto';
import { LeaveCallDto } from './dto/leave-call.dto';
import { createMockUserToken, mockUserPayload } from './fixtures';

describe('Testing Call Endpoints', () => {
  let callController: CallController;
  let callUseCase: DeepMocked<CallUseCase>;
  let roomUserUseCase: DeepMocked<RoomUserUseCase>;

  const mockRoomId = 'test-room-id';
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
        appId: 'jitsi-app-id',
      };

      callUseCase.validateUserHasNoActiveRoom.mockResolvedValueOnce(undefined);
      callUseCase.createCallAndRoom.mockResolvedValueOnce(mockResponse);

      const result = await callController.createCall(mockUserToken.payload);

      expect(callUseCase.validateUserHasNoActiveRoom).toHaveBeenCalledWith(
        mockUserToken.payload.uuid,
        mockUserToken.payload.email,
      );
      expect(callUseCase.createCallAndRoom).toHaveBeenCalledWith(
        mockUserToken.payload,
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
    it('should join a call with authenticated user', async () => {
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

    it('should join a call with anonymous user (no JWT)', async () => {
      callUseCase.joinCall.mockResolvedValue(mockJoinCallResponse);

      const result = await callController.joinCall(
        mockRoomId,
        null,
        mockJoinCallDto,
      );

      expect(result).toEqual(mockJoinCallResponse);
      expect(callUseCase.joinCall).toHaveBeenCalledWith(mockRoomId, {
        userId: undefined,
        email: mockJoinCallDto.email,
        name: mockJoinCallDto.name,
        lastName: mockJoinCallDto.lastName,
        anonymous: true,
      });
    });

    it('should set anonymous=true if anonymous flag is explicitly set', async () => {
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
        callController.joinCall(mockRoomId, mockUserToken.payload),
      ).rejects.toThrow(NotFoundException);
    });

    it('When user is already in room, it should throw ConflictException', async () => {
      const mockUserToken = createMockUserToken();

      callUseCase.joinCall.mockRejectedValueOnce(
        new ConflictException('User is already in this room'),
      );

      await expect(
        callController.joinCall(mockRoomId, mockUserToken.payload),
      ).rejects.toThrow(ConflictException);
    });

    it('When room is full, it should throw BadRequestException', async () => {
      const mockUserToken = createMockUserToken();

      callUseCase.joinCall.mockRejectedValueOnce(
        new BadRequestException('Room is at maximum capacity'),
      );

      await expect(
        callController.joinCall(mockRoomId, mockUserToken.payload),
      ).rejects.toThrow(BadRequestException);
    });

    it('When an unexpected error occurs, it should propagate the error', async () => {
      const mockUserToken = createMockUserToken();

      callUseCase.joinCall.mockRejectedValueOnce(new Error('Unexpected error'));

      await expect(
        callController.joinCall(mockRoomId, mockUserToken.payload),
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
  });

  describe('Getting users in a call', () => {
    it('should get users in a call for authenticated user', async () => {
      roomUserUseCase.getUsersInRoom.mockResolvedValue(mockUsersInRoom);

      const result = await callController.getUsersInCall(mockRoomId);

      expect(result).toEqual(mockUsersInRoom);
      expect(roomUserUseCase.getUsersInRoom).toHaveBeenCalledWith(mockRoomId);
    });

    it('should get users in a call for anonymous user', async () => {
      roomUserUseCase.getUsersInRoom.mockResolvedValue(mockUsersInRoom);

      const result = await callController.getUsersInCall(mockRoomId);

      expect(result).toEqual(mockUsersInRoom);
      expect(roomUserUseCase.getUsersInRoom).toHaveBeenCalledWith(mockRoomId);
    });

    it('When the room is not found, it should propagate NotFoundException', async () => {
      roomUserUseCase.getUsersInRoom.mockRejectedValueOnce(
        new NotFoundException('Specified room not found'),
      );

      await expect(callController.getUsersInCall(mockRoomId)).rejects.toThrow(
        NotFoundException,
      );
      expect(roomUserUseCase.getUsersInRoom).toHaveBeenCalledWith(mockRoomId);
    });

    it('When an unexpected error occurs, it should propagate the error', async () => {
      roomUserUseCase.getUsersInRoom.mockRejectedValueOnce(
        new Error('Unexpected error'),
      );

      await expect(callController.getUsersInCall(mockRoomId)).rejects.toThrow(
        Error,
      );
      expect(roomUserUseCase.getUsersInRoom).toHaveBeenCalledWith(mockRoomId);
    });

    it('When no users are in the room, it should return an empty array', async () => {
      roomUserUseCase.getUsersInRoom.mockResolvedValueOnce([]);

      const result = await callController.getUsersInCall(mockRoomId);

      expect(roomUserUseCase.getUsersInRoom).toHaveBeenCalledWith(mockRoomId);
      expect(result).toEqual([]);
      expect(result.length).toBe(0);
    });
  });

  describe('Leaving a call', () => {
    it('should leave a call for authenticated user', async () => {
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

    it('should call leaveCall with userId from DTO when user is anonymous', async () => {
      const anonymousUserId = 'anonymous-user-id';
      const leaveCallDto = new LeaveCallDto();
      leaveCallDto.userId = anonymousUserId;

      callUseCase.leaveCall.mockResolvedValueOnce();

      await callController.leaveCall(mockRoomId, null, leaveCallDto);

      expect(callUseCase.leaveCall).toHaveBeenCalledWith(
        mockRoomId,
        anonymousUserId,
      );
    });

    it('should prioritize user UUID when both authenticated user and DTO are provided', async () => {
      const leaveCallDto = new LeaveCallDto();
      leaveCallDto.userId = 'anonymous-user-id';

      callUseCase.leaveCall.mockResolvedValueOnce();

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

    it('should pass undefined when neither authenticated user nor DTO with userId are provided', async () => {
      const emptyDto = new LeaveCallDto();
      callUseCase.leaveCall.mockResolvedValueOnce();

      await callController.leaveCall(mockRoomId, null, emptyDto);

      expect(callUseCase.leaveCall).toHaveBeenCalledWith(mockRoomId, undefined);
    });

    it('should propagate NotFoundException when room is not found', async () => {
      const userToken = createMockUserToken();

      callUseCase.leaveCall.mockRejectedValueOnce(
        new NotFoundException('Specified room not found'),
      );

      await expect(
        callController.leaveCall(mockRoomId, userToken.payload),
      ).rejects.toThrow(NotFoundException);
    });

    it('should propagate BadRequestException when no userId is provided', async () => {
      callUseCase.leaveCall.mockRejectedValueOnce(
        new BadRequestException('User ID is required'),
      );

      await expect(callController.leaveCall(mockRoomId, null)).rejects.toThrow(
        BadRequestException,
      );
    });
  });
});
