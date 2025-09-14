import { createMock, DeepMocked } from '@golevelup/ts-jest';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { RoomUser } from './domain/room-user.domain';
import { Room } from './domain/room.domain';
import { RoomService } from './services/room.service';
import { CallService } from './services/call.service';
import { CallUseCase } from './call.usecase';
import { mockRoomData, mockUserPayload } from './fixtures';
import { v4 } from 'uuid';

jest.mock('uuid', () => ({
  v4: jest.fn(() => 'generated-uuid'),
}));

describe('CallUseCase', () => {
  let callUseCase: CallUseCase;
  let callService: DeepMocked<CallService>;
  let roomService: DeepMocked<RoomService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CallUseCase],
    })
      .useMocker(createMock)
      .compile();

    callUseCase = module.get<CallUseCase>(CallUseCase);
    callService = module.get<DeepMocked<CallService>>(CallService);
    roomService = module.get<DeepMocked<RoomService>>(RoomService);
  });

  describe('validateUserHasNoActiveRoom', () => {
    it('when user has no active room, then it should not throw', async () => {
      roomService.getOpenRoomByHostId.mockResolvedValueOnce(null);

      await expect(
        callUseCase.validateUserHasNoActiveRoom(
          mockUserPayload.uuid,
          mockUserPayload.email,
        ),
      ).resolves.not.toThrow();

      expect(roomService.getOpenRoomByHostId).toHaveBeenCalledWith(
        mockUserPayload.uuid,
      );
    });

    it('when user already has an active room, then it should throw', async () => {
      roomService.getOpenRoomByHostId.mockResolvedValueOnce(
        createMock<Room>(mockRoomData),
      );

      await expect(
        callUseCase.validateUserHasNoActiveRoom(
          mockUserPayload.uuid,
          mockUserPayload.email,
        ),
      ).rejects.toThrow(ConflictException);

      expect(roomService.getOpenRoomByHostId).toHaveBeenCalledWith(
        mockUserPayload.uuid,
      );
    });
  });

  describe('createCallAndRoom', () => {
    const mockCallToken = {
      token: 'call-token',
      room: v4(),
      paxPerCall: 10,
      appId: 'jitsi-app-id',
    };

    it('when creating call and room and user does not have an active room, then should create a call token and room successfully', async () => {
      callService.createCallToken.mockResolvedValueOnce(mockCallToken);
      roomService.createRoom.mockResolvedValueOnce(undefined);
      jest
        .spyOn(callUseCase, 'validateUserHasNoActiveRoom')
        .mockResolvedValueOnce(null);

      const result = await callUseCase.createCallAndRoom(mockUserPayload);

      expect(callService.createCallToken).toHaveBeenCalledWith(mockUserPayload);
      expect(roomService.createRoom).toHaveBeenCalledWith(expect.any(Room));
      expect(result).toEqual(mockCallToken);
    });
  });

  describe('joinCall', () => {
    const roomId = 'test-room-id';
    const userId = 'test-user-id';
    const userName = 'Test User';
    const userLastName = 'Last Name';
    const roomMock = createMock<Room>(mockRoomData);
    const callToken = {
      token: 'test-call-token',
      appId: 'jitsi-app-id',
    };

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

    it('when joining call with registered user data, then should join successfully', async () => {
      const userData = {
        userId,
        name: userName,
        lastName: userLastName,
      };

      roomService.getRoomByRoomId.mockResolvedValueOnce(roomMock);
      roomService.addUserToRoom.mockResolvedValueOnce(roomUserMock);
      callService.createCallTokenForParticipant.mockReturnValueOnce(callToken);

      const result = await callUseCase.joinCall(roomId, userData);

      expect(roomService.getRoomByRoomId).toHaveBeenCalledWith(roomId);
      expect(roomService.addUserToRoom).toHaveBeenCalledWith(roomId, {
        userId,
        name: userName,
        lastName: userLastName,
        anonymous: false,
        email: undefined,
      });
      expect(callService.createCallTokenForParticipant).toHaveBeenCalledWith(
        userId,
        roomId,
        false,
        false,
        {
          anonymous: false,
          email: undefined,
          lastName: 'Last Name',
          name: 'Test User',
          userId: 'test-user-id',
        },
      );
      expect(result).toEqual({
        token: callToken.token,
        room: roomId,
        userId,
        appId: callToken.appId,
      });
    });

    it('when joining call as anonymous user, then should join successfully', async () => {
      const userData = {
        anonymous: true,
        name: userName,
      };

      roomService.getRoomByRoomId.mockResolvedValueOnce(roomMock);
      roomService.addUserToRoom.mockResolvedValueOnce(anonymousUserMock);
      callService.createCallTokenForParticipant.mockReturnValueOnce(callToken);

      const result = await callUseCase.joinCall(roomId, userData);

      expect(roomService.getRoomByRoomId).toHaveBeenCalledWith(roomId);
      expect(roomService.addUserToRoom).toHaveBeenCalledWith(
        roomId,
        expect.objectContaining({
          name: userName,
          anonymous: true,
        }),
      );
      expect(callService.createCallTokenForParticipant).toHaveBeenCalledWith(
        anonymousUserMock.userId,
        roomId,
        true,
        false,
        {
          anonymous: true,
          email: undefined,
          lastName: undefined,
          name: userData.name,
          userId: anonymousUserMock.userId,
        },
      );
      expect(result).toEqual({
        token: callToken.token,
        room: roomId,
        userId: anonymousUserMock.userId,
        appId: callToken.appId,
      });
    });

    it('when joining call as host, then should join successfully and open the room', async () => {
      const userData = { userId: roomMock.hostId };
      const closedRoomMock = { ...roomMock, isClosed: true };

      roomService.getRoomByRoomId.mockResolvedValueOnce(closedRoomMock);
      roomService.addUserToRoom.mockResolvedValueOnce(roomUserMock);
      callService.createCallTokenForParticipant.mockReturnValueOnce(callToken);
      roomService.openRoom.mockResolvedValueOnce();

      await callUseCase.joinCall(roomId, userData);

      expect(roomService.openRoom).toHaveBeenCalledWith(roomId);
    });

    it('when room does not exist, then should throw NotFoundException', async () => {
      const userData = { userId };
      roomService.getRoomByRoomId.mockResolvedValueOnce(null);

      await expect(callUseCase.joinCall(roomId, userData)).rejects.toThrow(
        NotFoundException,
      );

      expect(roomService.getRoomByRoomId).toHaveBeenCalledWith(roomId);
    });

    it('when non-owner tries to join closed room, then should throw', async () => {
      const userData = { userId };
      const closedRoomMock = {
        ...roomMock,
        isClosed: true,
        hostId: 'different-host-id',
      };

      roomService.getRoomByRoomId.mockResolvedValueOnce(closedRoomMock);

      await expect(callUseCase.joinCall(roomId, userData)).rejects.toThrow(
        ForbiddenException,
      );

      expect(roomService.getRoomByRoomId).toHaveBeenCalledWith(roomId);
    });

    it('when roomService throws BadRequestException, then should propagate error', async () => {
      const userData = { userId };
      const error = new BadRequestException('Invalid user data');
      const openRoomMock = { ...roomMock, isClosed: false };

      roomService.getRoomByRoomId.mockResolvedValueOnce(openRoomMock);
      roomService.addUserToRoom.mockRejectedValueOnce(error);

      await expect(callUseCase.joinCall(roomId, userData)).rejects.toThrow(
        BadRequestException,
      );

      expect(roomService.getRoomByRoomId).toHaveBeenCalledWith(roomId);
      expect(roomService.addUserToRoom).toHaveBeenCalledWith(
        roomId,
        expect.objectContaining({
          userId,
          anonymous: false,
        }),
      );
    });

    it('when roomService throws ConflictException, then should propagate error', async () => {
      const userData = { userId };
      const error = new ConflictException('User already in room');
      const openRoomMock = { ...roomMock, isClosed: false };

      roomService.getRoomByRoomId.mockResolvedValueOnce(openRoomMock);
      roomService.addUserToRoom.mockRejectedValueOnce(error);

      await expect(callUseCase.joinCall(roomId, userData)).rejects.toThrow(
        ConflictException,
      );
    });

    it('When there is an unknown error, then propagate the error', async () => {
      const userData = { userId };
      const error = new Error('Unknown error');

      roomService.getRoomByRoomId.mockRejectedValueOnce(error);

      await expect(callUseCase.joinCall(roomId, userData)).rejects.toThrow(
        Error,
      );
    });
  });

  describe('processUserData', () => {
    it('should handle registered user data correctly', async () => {
      const roomId = 'test-room-id';
      const userId = 'test-user-id';
      const name = 'Test User';
      const lastName = 'Last Name';
      const callToken = {
        token: 'test-call-token',
        appId: 'jitsi-app-id',
      };
      const openRoomMock = createMock<Room>({
        ...mockRoomData,
        isClosed: false,
      });
      roomService.getRoomByRoomId.mockResolvedValueOnce(openRoomMock);

      const registeredRoomUser = new RoomUser({
        id: 1,
        roomId,
        userId,
        name,
        lastName,
        anonymous: false,
      });

      roomService.addUserToRoom.mockResolvedValueOnce(registeredRoomUser);
      const createCallTokenForParticipantSpy = jest
        .spyOn(callService, 'createCallTokenForParticipant')
        .mockReturnValueOnce(callToken);

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
        false,
        {
          anonymous: false,
          email: undefined,
          lastName: 'Last Name',
          name: 'Test User',
          userId: 'test-user-id',
        },
      );
    });

    it('should handle anonymous user data correctly', async () => {
      const roomId = 'test-room-id';
      const name = 'Anonymous User';
      const callToken = {
        token: 'test-call-token',
        appId: 'jitsi-app-id',
      };

      const openRoomMock = createMock<Room>({
        ...mockRoomData,
        isClosed: false,
      });
      roomService.getRoomByRoomId.mockResolvedValueOnce(openRoomMock);

      const anonymousRoomUser = new RoomUser({
        id: 1,
        roomId,
        userId: 'generated-id',
        name,
        anonymous: true,
      });

      roomService.addUserToRoom.mockResolvedValueOnce(anonymousRoomUser);
      callService.createCallTokenForParticipant.mockReturnValueOnce(callToken);

      await callUseCase.joinCall(roomId, {
        name,
        anonymous: true,
      });

      expect(roomService.addUserToRoom).toHaveBeenCalledWith(
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
      const callToken = {
        token: 'test-call-token',
        appId: 'jitsi-app-id',
      };

      const openRoomMock = createMock<Room>({
        ...mockRoomData,
        isClosed: false,
      });
      roomService.getRoomByRoomId.mockResolvedValueOnce(openRoomMock);

      const userWithoutId = new RoomUser({
        id: 1,
        roomId,
        userId: 'generated-id',
        name,
        anonymous: true,
      });

      roomService.addUserToRoom.mockResolvedValueOnce(userWithoutId);
      callService.createCallTokenForParticipant.mockReturnValueOnce(callToken);

      await callUseCase.joinCall(roomId, {
        name,
      });

      expect(roomService.addUserToRoom).toHaveBeenCalledWith(
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
      roomService.getRoomByRoomId.mockResolvedValue(roomMock);
      roomService.removeUserFromRoom.mockResolvedValue();
      roomService.closeRoom.mockResolvedValue();
      roomService.removeRoom.mockResolvedValue();
    });

    it('when a valid userId is provided, then should handle leave call normally', async () => {
      roomService.removeUserFromRoom.mockResolvedValueOnce(undefined);
      roomService.countUsersInRoom.mockResolvedValueOnce(0);

      await callUseCase.leaveCall(roomId, participantId);

      expect(roomService.getRoomByRoomId).toHaveBeenCalledWith(roomId);
      expect(roomService.removeUserFromRoom).toHaveBeenCalledWith(
        participantId,
        roomMock,
      );
      expect(roomService.removeRoom).toHaveBeenCalledWith(roomId);
    });

    it('when room does not exist, then should throw', async () => {
      roomService.getRoomByRoomId.mockResolvedValueOnce(null);

      await expect(
        callUseCase.leaveCall(roomId, participantId),
      ).rejects.toThrow(NotFoundException);
      expect(roomService.getRoomByRoomId).toHaveBeenCalledWith(roomId);
      expect(roomService.removeUserFromRoom).not.toHaveBeenCalled();
      expect(roomService.closeRoom).not.toHaveBeenCalled();
      expect(roomService.removeRoom).not.toHaveBeenCalled();
    });

    it('when host leaves a non-empty room, then should remove user and close room', async () => {
      roomService.countUsersInRoom.mockResolvedValueOnce(1);

      await callUseCase.leaveCall(roomId, hostId);

      expect(roomService.getRoomByRoomId).toHaveBeenCalledWith(roomId);
      expect(roomService.removeUserFromRoom).toHaveBeenCalledWith(
        hostId,
        roomMock,
      );
      expect(roomService.countUsersInRoom).toHaveBeenCalledWith(roomId);
      expect(roomService.closeRoom).toHaveBeenCalledWith(roomId);
      expect(roomService.removeRoom).not.toHaveBeenCalled();
    });

    it('when the last user (host) leaves, then should remove user and delete room', async () => {
      roomService.countUsersInRoom.mockResolvedValueOnce(0);

      await callUseCase.leaveCall(roomId, hostId);

      expect(roomService.getRoomByRoomId).toHaveBeenCalledWith(roomId);
      expect(roomService.removeUserFromRoom).toHaveBeenCalledWith(
        hostId,
        roomMock,
      );
      expect(roomService.countUsersInRoom).toHaveBeenCalledWith(roomId);
      expect(roomService.removeRoom).toHaveBeenCalledWith(roomId);
      expect(roomService.closeRoom).not.toHaveBeenCalled();
    });

    it('when the last user (participant) leaves, then should remove user and delete room', async () => {
      roomService.countUsersInRoom.mockResolvedValueOnce(0);

      await callUseCase.leaveCall(roomId, participantId);

      expect(roomService.getRoomByRoomId).toHaveBeenCalledWith(roomId);
      expect(roomService.removeUserFromRoom).toHaveBeenCalledWith(
        participantId,
        roomMock,
      );
      expect(roomService.countUsersInRoom).toHaveBeenCalledWith(roomId);
      expect(roomService.removeRoom).toHaveBeenCalledWith(roomId);
      expect(roomService.closeRoom).not.toHaveBeenCalled();
    });

    it('when a participant leaves a non-empty room, then should remove user but not close or delete room', async () => {
      roomService.countUsersInRoom.mockResolvedValueOnce(2);

      await callUseCase.leaveCall(roomId, participantId);

      expect(roomService.getRoomByRoomId).toHaveBeenCalledWith(roomId);
      expect(roomService.removeUserFromRoom).toHaveBeenCalledWith(
        participantId,
        roomMock,
      );
      expect(roomService.countUsersInRoom).toHaveBeenCalledWith(roomId);
      expect(roomService.closeRoom).not.toHaveBeenCalled();
      expect(roomService.removeRoom).not.toHaveBeenCalled();
    });

    it('when host leaves call, then should leave successfully and close the room', async () => {
      roomService.countUsersInRoom.mockResolvedValueOnce(1);
      roomMock.hostId = hostId;

      await callUseCase.leaveCall(roomId, hostId);

      expect(roomService.getRoomByRoomId).toHaveBeenCalledWith(roomId);
      expect(roomService.removeUserFromRoom).toHaveBeenCalledWith(
        hostId,
        roomMock,
      );
      expect(roomService.countUsersInRoom).toHaveBeenCalledWith(roomId);
      expect(roomService.closeRoom).toHaveBeenCalledWith(roomId);
      expect(roomService.removeRoom).not.toHaveBeenCalled();
    });

    it('when anonymous user leaves call, then should leave successfully', async () => {
      roomService.countUsersInRoom.mockResolvedValueOnce(1);

      await callUseCase.leaveCall(roomId, anonymousUserId);

      expect(roomService.getRoomByRoomId).toHaveBeenCalledWith(roomId);
      expect(roomService.removeUserFromRoom).toHaveBeenCalledWith(
        anonymousUserId,
        roomMock,
      );
      expect(roomService.countUsersInRoom).toHaveBeenCalledWith(roomId);
    });

    it('when error occurs during leave call operation, then should propagate error', async () => {
      const error = new Error('Database error');
      roomService.getRoomByRoomId.mockRejectedValueOnce(error);

      await expect(
        callUseCase.leaveCall(roomId, participantId),
      ).rejects.toThrow(error);
    });

    it('when roomService throws, then should propagate error', async () => {
      const error = new BadRequestException('Invalid user');
      roomService.getRoomByRoomId.mockResolvedValueOnce(roomMock);
      roomService.removeUserFromRoom.mockRejectedValueOnce(error);

      await expect(
        callUseCase.leaveCall(roomId, participantId),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
