import { createMock, DeepMocked } from '@golevelup/ts-jest';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import * as crypto from 'crypto';
import { Sequelize } from 'sequelize-typescript';
import { Room } from '../../domain/room.domain';
import { RoomUser } from '../../domain/room-user.domain';
import { RoomService } from '../../services/room.service';
import { SequelizeRoomUserRepository } from '../../infrastructure/room-user.repository';
import { CallService } from '../../services/call.service';
import {
  JitsiGenericWebHookEvent,
  JitsiParticipantJoinedWebHookPayload,
  JitsiWebhookPayload,
} from './interfaces/JitsiGenericWebHookPayload';
import { JitsiParticipantLeftWebHookPayload } from './interfaces/JitsiParticipantLeftData';
import { JitsiWebhookService } from './jitsi-webhook.service';
import { v4 } from 'uuid';
import { Time } from '../../../../common/time';

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
  let callService: DeepMocked<CallService>;
  let roomUserRepository: DeepMocked<SequelizeRoomUserRepository>;
  let sequelize: DeepMocked<Sequelize>;

  const minimalRoom = new Room({
    id: 'test-room-id',
    maxUsersAllowed: 10,
    hostId: 'host-id',
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
    callService = module.get<DeepMocked<CallService>>(CallService);
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
      roomService.getRoomByRoomId.mockResolvedValue(minimalRoom);
      roomUserRepository.deleteByParticipantAndTimestamp.mockResolvedValue(1);

      const mockEvent: JitsiParticipantLeftWebHookPayload = {
        idempotencyKey: 'test-key',
        customerId: 'customer-id',
        appId: 'app-id',
        eventType: JitsiGenericWebHookEvent.PARTICIPANT_LEFT,
        sessionId: 'session-id',
        timestamp: Date.now(),
        fqn: 'app-id/test-room-id',
        data: {
          moderator: 'false',
          name: 'Test User',
          disconnectReason: 'left',
          id: 'test-participant-id/room-user-id',
          participantJid: 'test-jid',
          participantId: 'test-participant-id',
        },
      };

      await service.handleParticipantLeft(mockEvent);

      expect(
        roomUserRepository.deleteByParticipantAndTimestamp,
      ).toHaveBeenCalledWith(
        'room-user-id',
        'test-participant-id',
        new Date(mockEvent.timestamp),
      );
    });

    it('When room owner leaves, then it should close room and remove user', async () => {
      const ownerRoom = new Room({
        id: 'test-room-id',
        hostId: 'test-participant-id',
        maxUsersAllowed: 10,
        isClosed: false,
      });

      roomService.getRoomByRoomId.mockResolvedValue(ownerRoom);
      roomService.closeRoom.mockResolvedValue(undefined);
      roomUserRepository.deleteByParticipantAndTimestamp.mockResolvedValue(1);

      const mockEvent: JitsiParticipantLeftWebHookPayload = {
        idempotencyKey: 'test-key',
        customerId: 'customer-id',
        appId: 'app-id',
        eventType: JitsiGenericWebHookEvent.PARTICIPANT_LEFT,
        sessionId: 'session-id',
        timestamp: Date.now(),
        fqn: 'app-id/test-room-id',
        data: {
          moderator: 'false',
          name: 'Test User',
          disconnectReason: 'left',
          id: 'test-participant-id/room-user-id',
          participantJid: 'test-jid',
          participantId: 'test-participant-id',
        },
      };

      await service.handleParticipantLeft(mockEvent);

      expect(roomService.closeRoom).toHaveBeenCalledWith('test-room-id');

      expect(
        roomUserRepository.deleteByParticipantAndTimestamp,
      ).toHaveBeenCalledWith(
        'room-user-id',
        'test-participant-id',
        new Date(mockEvent.timestamp),
      );
    });

    it('When non-owner participant leaves, then it should not close room but remove user', async () => {
      const ownerRoom = new Room({
        id: 'test-room-id',
        hostId: 'test-participant-id-not-owner',
        maxUsersAllowed: 10,
        isClosed: false,
      });

      roomService.getRoomByRoomId.mockResolvedValue(ownerRoom);
      roomService.closeRoom.mockResolvedValue(undefined);
      roomUserRepository.deleteByParticipantAndTimestamp.mockResolvedValue(1);

      const mockEvent: JitsiParticipantLeftWebHookPayload = {
        idempotencyKey: 'test-key',
        customerId: 'customer-id',
        appId: 'app-id',
        eventType: JitsiGenericWebHookEvent.PARTICIPANT_LEFT,
        sessionId: 'session-id',
        timestamp: Date.now(),
        fqn: 'app-id/test-room-id',
        data: {
          moderator: 'false',
          name: 'Test User',
          disconnectReason: 'left',
          id: 'test-participant-id/room-user-id',
          participantJid: 'test-jid',
          participantId: 'test-participant-id',
        },
      };

      await service.handleParticipantLeft(mockEvent);

      expect(roomService.closeRoom).not.toHaveBeenCalled();

      expect(
        roomUserRepository.deleteByParticipantAndTimestamp,
      ).toHaveBeenCalledWith(
        'room-user-id',
        'test-participant-id',
        new Date(mockEvent.timestamp),
      );
    });

    it('When FQN has missing room ID, then it should skip processing', async () => {
      const mockEvent: JitsiParticipantLeftWebHookPayload = {
        idempotencyKey: 'test-key',
        customerId: 'customer-id',
        appId: 'app-id',
        eventType: JitsiGenericWebHookEvent.PARTICIPANT_LEFT,
        sessionId: 'session-id',
        timestamp: Date.now(),
        fqn: '',
        data: {
          moderator: 'false',
          name: 'Test User',
          disconnectReason: 'left',
          id: 'test-participant-id/room-user-id',
          participantJid: 'test-jid',
          participantId: 'test-participant-id',
        },
      };

      await service.handleParticipantLeft(mockEvent);

      expect(
        roomUserRepository.deleteByParticipantAndTimestamp,
      ).not.toHaveBeenCalled();
    });

    it('When participant ID is empty, then it should process with undefined roomUserId', async () => {
      roomService.getRoomByRoomId.mockResolvedValue(minimalRoom);
      roomUserRepository.deleteByParticipantAndTimestamp.mockResolvedValue(0);

      const mockEvent: JitsiParticipantLeftWebHookPayload = {
        idempotencyKey: 'test-key',
        customerId: 'customer-id',
        appId: 'app-id',
        eventType: JitsiGenericWebHookEvent.PARTICIPANT_LEFT,
        sessionId: 'session-id',
        timestamp: Date.now(),
        fqn: 'app-id/test-room-id',
        data: {
          moderator: 'false',
          name: 'Test User',
          disconnectReason: 'left',
          id: '', // Empty participant ID
          participantJid: 'test-jid',
          participantId: 'test-participant-id',
        },
      };

      await service.handleParticipantLeft(mockEvent);

      expect(
        roomUserRepository.deleteByParticipantAndTimestamp,
      ).toHaveBeenCalledWith(
        undefined,
        'test-participant-id',
        new Date(mockEvent.timestamp),
      );
    });
  });

  describe('handleParticipantJoined', () => {
    beforeEach(() => {
      sequelize.transaction.mockImplementation((callback: any) => {
        const mockTransaction = {};
        return callback(mockTransaction);
      });
    });

    it('When room has expired, then it should remove room', async () => {
      const expiredDate = Time.now('2020-01-01');
      const expiredRoom = new Room({
        id: v4(),
        maxUsersAllowed: 10,
        hostId: v4(),
        removeAt: expiredDate,
      });
      const mockJoinedEvent: JitsiParticipantJoinedWebHookPayload = {
        idempotencyKey: 'test-key',
        customerId: 'customer-id',
        appId: 'app-id',
        eventType: JitsiGenericWebHookEvent.PARTICIPANT_JOINED,
        sessionId: v4(),
        timestamp: 1609459200000, // 2021-01-01
        fqn: 'app-id/test-room-id',
        data: {
          moderator: false,
          name: 'Test User',
          id: 'test-user-id/room-user-id',
          participantJid: 'test-jid',
          participantId: 'test-participant-id',
        },
      };

      roomService.getRoomByRoomId.mockResolvedValue(expiredRoom);
      roomService.removeRoom.mockResolvedValue(undefined);

      await service.handleParticipantJoined(mockJoinedEvent);

      expect(roomService.removeRoom).toHaveBeenCalledWith(expiredRoom.id);
    });

    it('When room has not expired, then it should continue normal processing', async () => {
      const futureDate = new Date('2030-12-31');
      const activeRoom = new Room({
        id: v4(),
        maxUsersAllowed: 10,
        hostId: v4(),
        removeAt: futureDate,
      });
      const mockJoinedEvent: JitsiParticipantJoinedWebHookPayload = {
        idempotencyKey: 'test-key',
        customerId: 'customer-id',
        appId: 'app-id',
        eventType: JitsiGenericWebHookEvent.PARTICIPANT_JOINED,
        sessionId: v4(),
        timestamp: 1609459200000, // 2021-01-01
        fqn: 'app-id/test-room-id',
        data: {
          moderator: false,
          name: 'Test User',
          id: 'test-user-id/room-user-id',
          participantJid: 'test-jid',
          participantId: 'test-participant-id',
        },
      };

      roomService.getRoomByRoomId.mockResolvedValue(activeRoom);

      const mockRoomUser = new RoomUser({
        id: v4(),
        userId: v4(),
        roomId: activeRoom.id,
        participantId: undefined,
        joinedAt: undefined,
        anonymous: false,
      });

      roomUserRepository.findById.mockResolvedValue(mockRoomUser);
      roomUserRepository.update.mockResolvedValue(undefined);

      await service.handleParticipantJoined(mockJoinedEvent);

      expect(roomService.removeRoom).not.toHaveBeenCalled();
      expect(roomUserRepository.findById).toHaveBeenCalled();
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
