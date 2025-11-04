import { createMock, DeepMocked } from '@golevelup/ts-jest';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import * as crypto from 'crypto';
import { Sequelize } from 'sequelize-typescript';
import { Room } from '../../domain/room.domain';
import { RoomService } from '../../services/room.service';
import { SequelizeRoomUserRepository } from '../../infrastructure/room-user.repository';
import {
  JitsiGenericWebHookEvent,
  JitsiWebhookPayload,
} from './interfaces/JitsiGenericWebHookPayload';
import { JitsiWebhookService } from './jitsi-webhook.service';
import { Time } from '../../../../common/time';
import {
  createMockJitsiWebhookEvent,
  createMockJitsiParticipantLeftWebhookEvent,
  createMockRoom,
  createMockRoomUser,
} from '../../fixtures';
import { SequelizeRoomRepository } from '../../infrastructure/room.repository';
import { v4 } from 'uuid';

jest.mock('crypto', () => {
  const originalModule = jest.requireActual<typeof import('crypto')>('crypto');
  return {
    ...originalModule,
    createHmac: jest.fn().mockImplementation(() => ({
      update: jest.fn().mockReturnThis(),
      digest: jest.fn().mockReturnValue('mocked-signature'),
    })),
    timingSafeEqual: jest.fn() as jest.MockedFunction<
      typeof crypto.timingSafeEqual
    >,
  };
});

describe('JitsiWebhookService', () => {
  let service: JitsiWebhookService;
  let roomService: DeepMocked<RoomService>;
  let configService: DeepMocked<ConfigService>;
  let roomUserRepository: DeepMocked<SequelizeRoomUserRepository>;
  let roomRepository: DeepMocked<SequelizeRoomRepository>;

  let sequelize: DeepMocked<Sequelize>;

  const minimalRoom = new Room({
    id: v4(),
    maxUsersAllowed: 10,
    hostId: v4(),
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [JitsiWebhookService],
    })
      .setLogger(createMock<Logger>())
      .useMocker(createMock)
      .compile();

    service = module.get<JitsiWebhookService>(JitsiWebhookService);
    roomService = module.get<DeepMocked<RoomService>>(RoomService);
    configService = module.get<DeepMocked<ConfigService>>(ConfigService);
    roomRepository = module.get<DeepMocked<SequelizeRoomRepository>>(
      SequelizeRoomRepository,
    );

    roomUserRepository = module.get<DeepMocked<SequelizeRoomUserRepository>>(
      SequelizeRoomUserRepository,
    );
    sequelize = module.get<DeepMocked<Sequelize>>(Sequelize);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('handleParticipantLeft', () => {
    it('When participant leaves, then it should remove user from room', async () => {
      const participantId = v4();
      const roomUserId = v4();
      const roomId = v4();

      roomService.getRoomByRoomId.mockResolvedValue(minimalRoom);
      roomUserRepository.destroyParticipantWithOlderTimestamp.mockResolvedValue(
        1,
      );

      const mockEvent = createMockJitsiParticipantLeftWebhookEvent({
        participantId,
        roomUserId,
        roomId,
        appId: 'app-id',
      });

      await service.handleParticipantLeft(mockEvent);

      expect(
        roomUserRepository.destroyParticipantWithOlderTimestamp,
      ).toHaveBeenCalledWith(
        roomUserId,
        participantId,
        Time.now(mockEvent.timestamp),
      );
    });

    it('When user leaves, then it should remove user', async () => {
      const participantId = v4();
      const roomUserId = v4();
      const roomId = v4();

      const ownerRoom = new Room({
        id: roomId,
        hostId: participantId,
        maxUsersAllowed: 10,
        isClosed: false,
      });

      roomService.getRoomByRoomId.mockResolvedValue(ownerRoom);
      roomUserRepository.destroyParticipantWithOlderTimestamp.mockResolvedValue(
        1,
      );

      const mockEvent = createMockJitsiParticipantLeftWebhookEvent({
        participantId,
        roomUserId,
        roomId,
        appId: 'app-id',
      });

      await service.handleParticipantLeft(mockEvent);

      expect(
        roomUserRepository.destroyParticipantWithOlderTimestamp,
      ).toHaveBeenCalledWith(
        roomUserId,
        participantId,
        Time.now(mockEvent.timestamp),
      );
    });

    it('When FQN has missing room ID, then it should skip processing', async () => {
      const participantId = v4();
      const roomUserId = v4();

      const mockEvent = createMockJitsiParticipantLeftWebhookEvent({
        participantId,
        roomUserId,
        overrides: {
          fqn: '',
        },
      });

      await service.handleParticipantLeft(mockEvent);

      expect(
        roomUserRepository.destroyParticipantWithOlderTimestamp,
      ).not.toHaveBeenCalled();
    });

    it('When participant ID is empty, then it should process with undefined roomUserId', async () => {
      const participantId = v4();
      const roomId = v4();
      const participantJid = v4();

      roomService.getRoomByRoomId.mockResolvedValue(minimalRoom);
      roomUserRepository.destroyParticipantWithOlderTimestamp.mockResolvedValue(
        0,
      );

      const mockEvent = createMockJitsiParticipantLeftWebhookEvent({
        participantId,
        roomId,
        appId: 'app-id',
        overrides: {
          data: {
            moderator: false,
            name: 'Test User',
            disconnectReason: 'left',
            id: '', // Empty participant ID
            participantJid,
            participantId,
          },
        },
      });

      await service.handleParticipantLeft(mockEvent);

      expect(
        roomUserRepository.destroyParticipantWithOlderTimestamp,
      ).toHaveBeenCalledWith(
        undefined,
        participantId,
        Time.now(mockEvent.timestamp),
      );
    });
  });

  describe('handleParticipantJoined', () => {
    const currentDate = Time.now('2025-01-01');

    beforeEach(() => {
      jest.useFakeTimers();
      jest.setSystemTime(currentDate);
      sequelize.transaction.mockImplementation((callback: any) => {
        const mockTransaction = {};
        return callback(mockTransaction);
      });
    });

    afterEach(() => jest.useRealTimers());

    it('When room has expired, then it should remove room', async () => {
      const expiredDate = Time.dateWithTimeAdded(-3, 'day', currentDate);
      const expiredRoom = createMockRoom({
        removeAt: expiredDate,
      });
      const mockJoinedEvent = createMockJitsiWebhookEvent({
        eventType: JitsiGenericWebHookEvent.PARTICIPANT_JOINED,
        roomId: expiredRoom.id,
      });

      roomService.getRoomByRoomId.mockResolvedValue(expiredRoom);
      roomService.removeRoom.mockResolvedValue(undefined);

      await service.handleParticipantJoined(mockJoinedEvent);

      expect(roomService.removeRoom).toHaveBeenCalledWith(expiredRoom.id);
    });

    it('When room has not expired, then it should continue normal processing', async () => {
      const futureDate = Time.dateWithTimeAdded(30, 'day', currentDate);
      const activeRoom = createMockRoom({
        removeAt: futureDate,
      });
      const mockRoomUser = createMockRoomUser({ roomId: activeRoom.id });
      const mockJoinedEvent = createMockJitsiWebhookEvent({
        eventType: JitsiGenericWebHookEvent.PARTICIPANT_JOINED,
        roomUserId: mockRoomUser.id,
        participantId: mockRoomUser.participantId,
        roomId: activeRoom.id,
      });
      roomService.getRoomByRoomId.mockResolvedValue(activeRoom);
      roomUserRepository.findById.mockResolvedValue(mockRoomUser);
      roomUserRepository.update.mockResolvedValue(undefined);

      await service.handleParticipantJoined(mockJoinedEvent);

      expect(roomService.removeRoom).not.toHaveBeenCalled();
      expect(roomUserRepository.findById).toHaveBeenCalled();
    });

    it('When room does not have expiration time, then it should set it', async () => {
      const room = createMockRoom({ removeAt: null });
      const roomUser = createMockRoomUser();
      const expirationTime = Time.dateWithTimeAdded(30, 'day');
      const mockJoinedEvent = createMockJitsiWebhookEvent({
        eventType: JitsiGenericWebHookEvent.PARTICIPANT_JOINED,
        participantId: roomUser.participantId,
        roomUserId: roomUser.id,
        roomId: room.id,
      });

      roomService.getRoomByRoomId.mockResolvedValue(room);
      roomUserRepository.findById.mockResolvedValue(roomUser);

      await service.handleParticipantJoined(mockJoinedEvent);

      expect(roomRepository.updateWhere).toHaveBeenCalledWith(
        {
          removeAt: null,
          id: room.id,
        },
        {
          removeAt: expirationTime,
        },
        expect.any(Object),
      );
    });
  });

  describe('validateWebhookRequest', () => {
    const mockPayload = {
      eventType: JitsiGenericWebHookEvent.PARTICIPANT_LEFT,
    } as unknown as JitsiWebhookPayload;

    it('When webhook secret is not configured, then it should skip validation', async () => {
      // Create a new service instance with a properly mocked config
      const testConfigService = createMock<ConfigService>();
      testConfigService.get.mockImplementation((key) => {
        if (key === 'jitsiWebhook.secret') return undefined;
        return undefined;
      });

      const testModule: TestingModule = await Test.createTestingModule({
        providers: [
          JitsiWebhookService,
          {
            provide: ConfigService,
            useValue: testConfigService,
          },
        ],
      })
        .useMocker(createMock)
        .compile();

      const testService =
        testModule.get<JitsiWebhookService>(JitsiWebhookService);
      const headers = { 'content-type': 'application/json' };

      const result = testService.validateWebhookRequest(headers, mockPayload);
      expect(result).toBe(true);
    });

    it('When signature is missing, then it should fail validation', () => {
      configService.get.mockImplementation((key, defaultValue) => {
        if (key === 'jitsiWebhook.secret') return 'webhook-secret';
        return defaultValue;
      });

      const headers = { 'content-type': 'application/json' };

      expect(service.validateWebhookRequest(headers, mockPayload)).toBe(false);
    });

    it('When raw body is missing, then it should fail validation', () => {
      configService.get.mockImplementation((key, defaultValue) => {
        if (key === 'jitsiWebhook.secret') return 'webhook-secret';
        return defaultValue;
      });

      const headers = {
        'content-type': 'application/json',
        'x-jaas-signature': 'signature',
      };

      expect(service.validateWebhookRequest(headers, mockPayload)).toBe(false);
    });

    it('When signature is valid, then it should pass validation', () => {
      const secret = 'webhook-secret';
      configService.get.mockImplementation((key, defaultValue) => {
        if (key === 'jitsiWebhook.secret') return secret;
        return defaultValue;
      });

      const signature =
        't=1757430085,v1=LnyXpAysJpOLDj6kZ43+QrzcqpXcPW/do7LlSCfhVVs=';

      const headers = {
        'content-type': 'application/json',
        'x-jaas-signature': signature,
      };

      (crypto.timingSafeEqual as jest.Mock).mockReturnValue(true);

      expect(service.validateWebhookRequest(headers, mockPayload)).toBe(true);
    });

    it('When signature is invalid, then it should fail validation', () => {
      const secret = 'webhook-secret';
      configService.get.mockImplementation((key, defaultValue) => {
        if (key === 'jitsiWebhook.secret') return secret;
        return defaultValue;
      });

      const headers = {
        'content-type': 'application/json',
        'x-jaas-signature': 'invalid-signature',
      };

      (crypto.timingSafeEqual as jest.Mock).mockReturnValue(false);

      expect(service.validateWebhookRequest(headers, mockPayload)).toBe(false);
    });
  });
});
