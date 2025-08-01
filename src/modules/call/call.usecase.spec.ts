import { createMock, DeepMocked } from '@golevelup/ts-jest';
import { Test, TestingModule } from '@nestjs/testing';
import { CallUseCase } from './call.usecase';
import { CallService } from './call.service';
import { RoomUseCase } from '../room/room.usecase';
import {
  BadRequestException,
  ConflictException,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { mockCallResponse, mockRoomData, mockUserPayload } from './fixtures';
import { Room } from '../room/room.domain';
import { RoomUserUseCase } from '../room/room-user.usecase';
import { RoomUser } from '../room/room-user.domain';

describe('CallUseCase', () => {
  let callUseCase: CallUseCase;
  let callService: DeepMocked<CallService>;
  let roomUseCase: DeepMocked<RoomUseCase>;
  let roomUserUseCase: DeepMocked<RoomUserUseCase>;

  beforeEach(async () => {
    callService = createMock<CallService>();
    roomUseCase = createMock<RoomUseCase>();
    roomUserUseCase = createMock<RoomUserUseCase>();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CallUseCase,
        {
          provide: CallService,
          useValue: callService,
        },
        {
          provide: RoomUseCase,
          useValue: roomUseCase,
        },
        {
          provide: RoomUserUseCase,
          useValue: roomUserUseCase,
        },
      ],
    }).compile();

    callUseCase = module.get<CallUseCase>(CallUseCase);
  });

  describe('validateUserHasNoActiveRoom', () => {
    it('should not throw when user has no active room', async () => {
      const getOpenRoomByHostIdSpy = jest
        .spyOn(roomUseCase, 'getOpenRoomByHostId')
        .mockResolvedValueOnce(null);

      await expect(
        callUseCase.validateUserHasNoActiveRoom(
          mockUserPayload.uuid,
          mockUserPayload.email,
        ),
      ).resolves.not.toThrow();

      expect(getOpenRoomByHostIdSpy).toHaveBeenCalledWith(mockUserPayload.uuid);
    });

    it('should throw ConflictException when user already has an active room', async () => {
      const getOpenRoomByHostIdSpy = jest
        .spyOn(roomUseCase, 'getOpenRoomByHostId')
        .mockResolvedValueOnce(createMock<Room>(mockRoomData));

      await expect(
        callUseCase.validateUserHasNoActiveRoom(
          mockUserPayload.uuid,
          mockUserPayload.email,
        ),
      ).rejects.toThrow(ConflictException);

      expect(getOpenRoomByHostIdSpy).toHaveBeenCalledWith(mockUserPayload.uuid);
    });

    it('should throw InternalServerErrorException when an unexpected error occurs', async () => {
      const getOpenRoomByHostIdSpy = jest
        .spyOn(roomUseCase, 'getOpenRoomByHostId')
        .mockRejectedValueOnce(new Error('Database error'));

      await expect(
        callUseCase.validateUserHasNoActiveRoom(
          mockUserPayload.uuid,
          mockUserPayload.email,
        ),
      ).rejects.toThrow(InternalServerErrorException);

      expect(getOpenRoomByHostIdSpy).toHaveBeenCalledWith(mockUserPayload.uuid);
    });
  });

  describe('createCallAndRoom', () => {
    it('should create a call token and room successfully', async () => {
      const createCallTokenSpy = jest
        .spyOn(callService, 'createCallToken')
        .mockResolvedValueOnce(mockCallResponse);
      const createRoomForCallSpy = jest
        .spyOn(callUseCase, 'createRoomForCall')
        .mockResolvedValueOnce();

      const result = await callUseCase.createCallAndRoom(mockUserPayload);

      expect(createCallTokenSpy).toHaveBeenCalledWith(mockUserPayload);
      expect(createRoomForCallSpy).toHaveBeenCalledWith(
        mockCallResponse,
        mockUserPayload.uuid,
        mockUserPayload.email,
      );
      expect(result).toEqual(mockCallResponse);
    });

    it('should propagate errors from call service', async () => {
      const error = new Error('Failed to create call');
      const createCallTokenSpy = jest
        .spyOn(callService, 'createCallToken')
        .mockRejectedValueOnce(error);

      await expect(
        callUseCase.createCallAndRoom(mockUserPayload),
      ).rejects.toThrow(error);

      expect(createCallTokenSpy).toHaveBeenCalledWith(mockUserPayload);
    });
  });

  describe('createRoomForCall', () => {
    it('should create a room for the call successfully', async () => {
      const createRoomSpy = jest
        .spyOn(roomUseCase, 'createRoom')
        .mockResolvedValueOnce(createMock<Room>(mockRoomData));

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
      const createRoomSpy = jest
        .spyOn(roomUseCase, 'createRoom')
        .mockRejectedValueOnce(new Error('Room already exists'));

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

  describe('joinCall', () => {
    const roomId = 'test-room-id';
    const userId = 'test-user-id';
    const userName = 'Test User';
    const userLastName = 'Last Name';
    const roomMock = createMock<Room>(mockRoomData);
    const callToken = 'test-call-token';

    // Create a proper RoomUser mock
    const roomUserMock = new RoomUser({
      id: 1,
      roomId,
      userId,
      name: userName,
      lastName: userLastName,
      anonymous: false,
    });

    // Create a proper anonymous RoomUser mock
    const anonymousUserMock = new RoomUser({
      id: 2,
      roomId,
      userId: 'generated-uuid',
      name: userName,
      anonymous: true,
    });

    it('should successfully join a call with registered user data', async () => {
      const userData = {
        userId,
        name: userName,
        lastName: userLastName,
      };

      const getRoomByRoomIdSpy = jest
        .spyOn(roomUseCase, 'getRoomByRoomId')
        .mockResolvedValueOnce(roomMock);
      const addUserToRoomSpy = jest
        .spyOn(roomUserUseCase, 'addUserToRoom')
        .mockResolvedValueOnce(roomUserMock);
      const createCallTokenForParticipantSpy = jest
        .spyOn(callService, 'createCallTokenForParticipant')
        .mockReturnValueOnce(callToken);

      const result = await callUseCase.joinCall(roomId, userData);

      expect(getRoomByRoomIdSpy).toHaveBeenCalledWith(roomId);
      expect(addUserToRoomSpy).toHaveBeenCalledWith(roomId, {
        userId,
        name: userName,
        lastName: userLastName,
        anonymous: false,
      });
      expect(createCallTokenForParticipantSpy).toHaveBeenCalledWith(
        userId,
        roomId,
        false,
      );
      expect(result).toEqual({
        token: callToken,
        room: roomId,
        userId,
      });
    });

    it('should successfully join a call as anonymous user', async () => {
      const userData = {
        anonymous: true,
        name: userName,
      };

      const getRoomByRoomIdSpy = jest
        .spyOn(roomUseCase, 'getRoomByRoomId')
        .mockResolvedValueOnce(roomMock);
      const addUserToRoomSpy = jest
        .spyOn(roomUserUseCase, 'addUserToRoom')
        .mockResolvedValueOnce(anonymousUserMock);
      const createCallTokenForParticipantSpy = jest
        .spyOn(callService, 'createCallTokenForParticipant')
        .mockReturnValueOnce(callToken);

      const result = await callUseCase.joinCall(roomId, userData);

      expect(getRoomByRoomIdSpy).toHaveBeenCalledWith(roomId);
      expect(addUserToRoomSpy).toHaveBeenCalledWith(
        roomId,
        expect.objectContaining({
          name: userName,
          anonymous: true,
        }),
      );
      expect(createCallTokenForParticipantSpy).toHaveBeenCalledWith(
        anonymousUserMock.userId,
        roomId,
        true,
      );
      expect(result).toEqual({
        token: callToken,
        room: roomId,
        userId: anonymousUserMock.userId,
      });
    });

    it('should successfully join a call as host and open the room', async () => {
      const userData = { userId: roomMock.hostId };
      roomMock.isClosed = true;
      jest
        .spyOn(roomUseCase, 'getRoomByRoomId')
        .mockResolvedValueOnce(roomMock);
      const openRoomSpy = jest
        .spyOn(roomUseCase, 'openRoom')
        .mockResolvedValueOnce();

      await callUseCase.joinCall(roomId, userData);

      expect(openRoomSpy).toHaveBeenCalledWith(roomId);
    });

    it('should throw NotFoundException when room does not exist', async () => {
      const userData = { userId };
      const getRoomByRoomIdSpy = jest
        .spyOn(roomUseCase, 'getRoomByRoomId')
        .mockResolvedValueOnce(null);

      await expect(callUseCase.joinCall(roomId, userData)).rejects.toThrow(
        NotFoundException,
      );

      expect(getRoomByRoomIdSpy).toHaveBeenCalledWith(roomId);
    });

    it('should propagate BadRequestException from roomUserUseCase', async () => {
      const userData = { userId };
      const error = new BadRequestException('Invalid user data');

      const getRoomByRoomIdSpy = jest
        .spyOn(roomUseCase, 'getRoomByRoomId')
        .mockResolvedValueOnce(roomMock);
      const addUserToRoomSpy = jest
        .spyOn(roomUserUseCase, 'addUserToRoom')
        .mockRejectedValueOnce(error);

      await expect(callUseCase.joinCall(roomId, userData)).rejects.toThrow(
        BadRequestException,
      );

      expect(getRoomByRoomIdSpy).toHaveBeenCalledWith(roomId);
      expect(addUserToRoomSpy).toHaveBeenCalledWith(
        roomId,
        expect.objectContaining({
          userId,
          anonymous: false,
        }),
      );
    });

    it('should propagate ConflictException from roomUserUseCase', async () => {
      const userData = { userId };
      const error = new ConflictException('User already in room');

      roomUseCase.getRoomByRoomId.mockResolvedValueOnce(roomMock);
      roomUserUseCase.addUserToRoom.mockRejectedValueOnce(error);

      await expect(callUseCase.joinCall(roomId, userData)).rejects.toThrow(
        ConflictException,
      );
    });

    it('should throw InternalServerErrorException for unknown errors', async () => {
      const userData = { userId };
      const error = new Error('Unknown error');

      roomUseCase.getRoomByRoomId.mockResolvedValueOnce(roomMock);
      roomUserUseCase.addUserToRoom.mockRejectedValueOnce(error);

      await expect(callUseCase.joinCall(roomId, userData)).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });

  describe('processUserData', () => {
    it('should handle registered user data correctly', async () => {
      const roomId = 'test-room-id';
      const userId = 'test-user-id';
      const name = 'Test User';
      const lastName = 'Last Name';

      const roomMock = createMock<Room>(mockRoomData);
      roomUseCase.getRoomByRoomId.mockResolvedValueOnce(roomMock);

      const registeredRoomUser = new RoomUser({
        id: 1,
        roomId,
        userId,
        name,
        lastName,
        anonymous: false,
      });

      roomUserUseCase.addUserToRoom.mockResolvedValueOnce(registeredRoomUser);
      const createCallTokenForParticipantSpy = jest
        .spyOn(callService, 'createCallTokenForParticipant')
        .mockReturnValueOnce('test-token');

      await callUseCase.joinCall(roomId, {
        userId,
        name,
        lastName,
        anonymous: false,
      });

      expect(createCallTokenForParticipantSpy).toHaveBeenCalledWith(
        userId,
        roomId,
        false,
      );
    });

    it('should handle anonymous user data correctly', async () => {
      const roomId = 'test-room-id';
      const name = 'Anonymous User';

      const roomMock = createMock<Room>(mockRoomData);
      roomUseCase.getRoomByRoomId.mockResolvedValueOnce(roomMock);

      const anonymousRoomUser = new RoomUser({
        id: 1,
        roomId,
        userId: 'generated-id',
        name,
        anonymous: true,
      });

      const addUserToRoomSpy = jest
        .spyOn(roomUserUseCase, 'addUserToRoom')
        .mockResolvedValueOnce(anonymousRoomUser);
      jest
        .spyOn(callService, 'createCallTokenForParticipant')
        .mockReturnValueOnce('test-token');

      await callUseCase.joinCall(roomId, {
        name,
        anonymous: true,
      });

      expect(addUserToRoomSpy).toHaveBeenCalledWith(
        roomId,
        expect.objectContaining({
          name,
          anonymous: true,
        }),
      );
    });

    it('should generate user ID when userId is not provided', async () => {
      const roomId = 'test-room-id';
      const name = 'User without ID';

      const roomMock = createMock<Room>(mockRoomData);
      roomUseCase.getRoomByRoomId.mockResolvedValueOnce(roomMock);

      const userWithoutId = new RoomUser({
        id: 1,
        roomId,
        userId: 'generated-id',
        name,
        anonymous: true,
      });

      const addUserToRoomSpy = jest
        .spyOn(roomUserUseCase, 'addUserToRoom')
        .mockResolvedValueOnce(userWithoutId);
      jest
        .spyOn(callService, 'createCallTokenForParticipant')
        .mockReturnValueOnce('test-token');

      await callUseCase.joinCall(roomId, {
        name,
      });

      expect(addUserToRoomSpy).toHaveBeenCalledWith(
        roomId,
        expect.objectContaining({
          name,
          anonymous: true,
        }),
      );
    });
  });

  describe('leaveCall', () => {
    const roomId = 'test-room-id';
    const hostId = 'host-user-id';
    const participantId = 'participant-user-id';
    const anonymousUserId = 'anonymous-user-id';
    let roomMock: DeepMocked<Room>;

    beforeEach(() => {
      roomMock = createMock<Room>({ ...mockRoomData, id: roomId, hostId });
      roomUseCase.getRoomByRoomId.mockResolvedValue(roomMock);
      roomUserUseCase.removeUserFromRoom.mockResolvedValue();
      roomUseCase.closeRoom.mockResolvedValue();
      roomUseCase.removeRoom.mockResolvedValue();
    });

    it('should throw BadRequestException when userId is not provided', async () => {
      await expect(callUseCase.leaveCall(roomId, undefined)).rejects.toThrow(
        BadRequestException,
      );

      expect(roomUseCase.getRoomByRoomId).not.toHaveBeenCalled();
      expect(roomUserUseCase.removeUserFromRoom).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException when room does not exist', async () => {
      roomUseCase.getRoomByRoomId.mockResolvedValueOnce(null);

      await expect(
        callUseCase.leaveCall(roomId, participantId),
      ).rejects.toThrow(NotFoundException);
      expect(roomUseCase.getRoomByRoomId).toHaveBeenCalledWith(roomId);
      expect(roomUserUseCase.removeUserFromRoom).not.toHaveBeenCalled();
      expect(roomUseCase.closeRoom).not.toHaveBeenCalled();
      expect(roomUseCase.removeRoom).not.toHaveBeenCalled();
    });

    it('should remove user and close room when host leaves a non-empty room', async () => {
      roomUserUseCase.countUsersInRoom.mockResolvedValueOnce(1);

      await callUseCase.leaveCall(roomId, hostId);

      expect(roomUseCase.getRoomByRoomId).toHaveBeenCalledWith(roomId);
      expect(roomUserUseCase.removeUserFromRoom).toHaveBeenCalledWith(
        hostId,
        roomMock,
      );
      expect(roomUserUseCase.countUsersInRoom).toHaveBeenCalledWith(roomId);
      expect(roomUseCase.closeRoom).toHaveBeenCalledWith(roomId);
      expect(roomUseCase.removeRoom).not.toHaveBeenCalled();
    });

    it('should remove user and delete room when the last user (host) leaves', async () => {
      roomUserUseCase.countUsersInRoom.mockResolvedValueOnce(0);

      await callUseCase.leaveCall(roomId, hostId);

      expect(roomUseCase.getRoomByRoomId).toHaveBeenCalledWith(roomId);
      expect(roomUserUseCase.removeUserFromRoom).toHaveBeenCalledWith(
        hostId,
        roomMock,
      );
      expect(roomUserUseCase.countUsersInRoom).toHaveBeenCalledWith(roomId);
      expect(roomUseCase.removeRoom).toHaveBeenCalledWith(roomId);
      expect(roomUseCase.closeRoom).not.toHaveBeenCalled();
    });

    it('should remove user and delete room when the last user (participant) leaves', async () => {
      roomUserUseCase.countUsersInRoom.mockResolvedValueOnce(0);

      await callUseCase.leaveCall(roomId, participantId);

      expect(roomUseCase.getRoomByRoomId).toHaveBeenCalledWith(roomId);
      expect(roomUserUseCase.removeUserFromRoom).toHaveBeenCalledWith(
        participantId,
        roomMock,
      );
      expect(roomUserUseCase.countUsersInRoom).toHaveBeenCalledWith(roomId);
      expect(roomUseCase.removeRoom).toHaveBeenCalledWith(roomId);
      expect(roomUseCase.closeRoom).not.toHaveBeenCalled();
    });

    it('should remove user but not close or delete room when a participant leaves a non-empty room', async () => {
      roomUserUseCase.countUsersInRoom.mockResolvedValueOnce(2);

      await callUseCase.leaveCall(roomId, participantId);

      expect(roomUseCase.getRoomByRoomId).toHaveBeenCalledWith(roomId);
      expect(roomUserUseCase.removeUserFromRoom).toHaveBeenCalledWith(
        participantId,
        roomMock,
      );
      expect(roomUserUseCase.countUsersInRoom).toHaveBeenCalledWith(roomId);
      expect(roomUseCase.closeRoom).not.toHaveBeenCalled();
      expect(roomUseCase.removeRoom).not.toHaveBeenCalled();
    });

    it('should successfully leave a call as host and close the room', async () => {
      roomUserUseCase.countUsersInRoom.mockResolvedValueOnce(1);
      roomMock.hostId = hostId;

      await callUseCase.leaveCall(roomId, hostId);

      expect(roomUseCase.getRoomByRoomId).toHaveBeenCalledWith(roomId);
      expect(roomUserUseCase.removeUserFromRoom).toHaveBeenCalledWith(
        hostId,
        roomMock,
      );
      expect(roomUserUseCase.countUsersInRoom).toHaveBeenCalledWith(roomId);
      expect(roomUseCase.closeRoom).toHaveBeenCalledWith(roomId);
      expect(roomUseCase.removeRoom).not.toHaveBeenCalled();
    });

    it('should successfully leave a call with anonymous user ID', async () => {
      roomUserUseCase.countUsersInRoom.mockResolvedValueOnce(1);

      await callUseCase.leaveCall(roomId, anonymousUserId);

      expect(roomUseCase.getRoomByRoomId).toHaveBeenCalledWith(roomId);
      expect(roomUserUseCase.removeUserFromRoom).toHaveBeenCalledWith(
        anonymousUserId,
        roomMock,
      );
      expect(roomUserUseCase.countUsersInRoom).toHaveBeenCalledWith(roomId);
    });

    it('should handle errors during leave call operation', async () => {
      const error = new Error('Database error');
      roomUseCase.getRoomByRoomId.mockRejectedValueOnce(error);

      await expect(
        callUseCase.leaveCall(roomId, participantId),
      ).rejects.toThrow(InternalServerErrorException);
    });

    it('should propagate BadRequestException from roomUserUseCase', async () => {
      const error = new BadRequestException('Invalid user');
      roomUseCase.getRoomByRoomId.mockResolvedValueOnce(roomMock);
      roomUserUseCase.removeUserFromRoom.mockRejectedValueOnce(error);

      await expect(
        callUseCase.leaveCall(roomId, participantId),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
