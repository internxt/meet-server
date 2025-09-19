import { createMock, DeepMocked } from '@golevelup/ts-jest';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import * as crypto from 'crypto';
import { Room } from '../../domain/room.domain';
import { RoomService } from '../../services/room.service';
import {
  JitsiGenericWebHookEvent,
  JitsiWebhookPayload,
} from './interfaces/JitsiGenericWebHookPayload';
import { JitsiParticipantLeftWebHookPayload } from './interfaces/JitsiParticipantLeftData';
import { JitsiWebhookService } from './jitsi-webhook.service';

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

    configService.get.mockImplementation((key, defaultValue) => {
      if (key === 'jitsiWebhook.events.participantLeft') return true;
      if (key === 'jitsiWebhook.secret') return undefined;
      return defaultValue;
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('handleParticipantLeft', () => {
    it('When participant leaves, then it should remove user from room', async () => {
      roomService.getRoomByRoomId.mockResolvedValue(minimalRoom);
      roomService.removeUserFromRoom.mockResolvedValue(undefined);

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
          id: 'test-participant-id',
          participantJid: 'test-jid',
          participantId: 'test-participant-id',
        },
      };

      await service.handleParticipantLeft(mockEvent);

      expect(roomService.removeUserFromRoom).toHaveBeenCalledWith(
        'test-participant-id',
        minimalRoom,
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
      roomService.removeUserFromRoom.mockResolvedValue(undefined);

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
          id: 'test-participant-id',
          participantJid: 'test-jid',
          participantId: 'test-participant-id',
        },
      };

      await service.handleParticipantLeft(mockEvent);

      expect(roomService.closeRoom).toHaveBeenCalledWith('test-room-id');

      expect(roomService.removeUserFromRoom).toHaveBeenCalledWith(
        'test-participant-id',
        ownerRoom,
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
      roomService.removeUserFromRoom.mockResolvedValue(undefined);

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
          id: 'test-participant-id',
          participantJid: 'test-jid',
          participantId: 'test-participant-id',
        },
      };

      await service.handleParticipantLeft(mockEvent);

      expect(roomService.closeRoom).not.toHaveBeenCalled();

      expect(roomService.removeUserFromRoom).toHaveBeenCalledWith(
        'test-participant-id',
        ownerRoom,
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
          id: 'test-participant-id',
          participantJid: 'test-jid',
          participantId: 'test-participant-id',
        },
      };

      await service.handleParticipantLeft(mockEvent);

      expect(roomService.removeUserFromRoom).not.toHaveBeenCalled();
    });

    it('When participant ID is missing, then it should skip processing', async () => {
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

      expect(roomService.removeUserFromRoom).not.toHaveBeenCalled();
    });
  });

  describe('validateWebhookRequest', () => {
    const mockPayload = {
      eventType: JitsiGenericWebHookEvent.PARTICIPANT_LEFT,
    } as unknown as JitsiWebhookPayload;

    it('When webhook secret is not configured, then it should skip validation', () => {
      configService.get.mockImplementation((key, defaultValue) => {
        if (key === 'jitsiWebhook.secret') return undefined;
        return defaultValue;
      });

      // Create a new service instance with the updated config mock
      const testService = new JitsiWebhookService(configService, roomService);

      const headers = { 'content-type': 'application/json' };

      expect(testService.validateWebhookRequest(headers, mockPayload)).toBe(
        true,
      );
    });

    it('When signature is missing, then it should fail validation', () => {
      configService.get.mockImplementation((key, defaultValue) => {
        if (key === 'jitsiWebhook.secret') return 'webhook-secret';
        return defaultValue;
      });

      const testService = new JitsiWebhookService(configService, roomService);
      const headers = { 'content-type': 'application/json' };

      expect(testService.validateWebhookRequest(headers, mockPayload)).toBe(
        false,
      );
    });

    it('When raw body is missing, then it should fail validation', () => {
      configService.get.mockImplementation((key, defaultValue) => {
        if (key === 'jitsiWebhook.secret') return 'webhook-secret';
        return defaultValue;
      });

      const testService = new JitsiWebhookService(configService, roomService);
      const headers = {
        'content-type': 'application/json',
        'x-jaas-signature': 'signature',
      };

      expect(testService.validateWebhookRequest(headers, mockPayload)).toBe(
        false,
      );
    });

    it('When signature is valid, then it should pass validation', () => {
      const secret = 'webhook-secret';
      configService.get.mockImplementation((key, defaultValue) => {
        if (key === 'jitsiWebhook.secret') return secret;
        return defaultValue;
      });

      const testService = new JitsiWebhookService(configService, roomService);
      const signature =
        't=1757430085,v1=LnyXpAysJpOLDj6kZ43+QrzcqpXcPW/do7LlSCfhVVs=';

      const headers = {
        'content-type': 'application/json',
        'x-jaas-signature': signature,
      };

      (crypto.timingSafeEqual as jest.Mock).mockReturnValue(true);

      expect(testService.validateWebhookRequest(headers, mockPayload)).toBe(
        true,
      );
    });

    it('When signature is invalid, then it should fail validation', () => {
      const secret = 'webhook-secret';
      configService.get.mockImplementation((key, defaultValue) => {
        if (key === 'jitsiWebhook.secret') return secret;
        return defaultValue;
      });

      const testService = new JitsiWebhookService(configService, roomService);
      const headers = {
        'content-type': 'application/json',
        'x-jaas-signature': 'invalid-signature',
      };

      (crypto.timingSafeEqual as jest.Mock).mockReturnValue(false);

      expect(testService.validateWebhookRequest(headers, mockPayload)).toBe(
        false,
      );
    });
  });
});
