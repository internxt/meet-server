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
      .useMocker(createMock)
      .compile();

    service = module.get<JitsiWebhookService>(JitsiWebhookService);
    roomService = module.get<DeepMocked<RoomService>>(RoomService);
    configService = module.get<DeepMocked<ConfigService>>(ConfigService);

    // Default config mock setup
    configService.get.mockImplementation((key, defaultValue) => {
      if (key === 'jitsiWebhook.events.participantLeft') return true;
      if (key === 'jitsiWebhook.secret') return undefined;
      return defaultValue;
    });

    // Mock logger
    jest.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('handleParticipantLeft', () => {
    it('should handle participant left event successfully', async () => {
      configService.get.mockImplementation((key, defaultValue) => {
        if (key === 'jitsiWebhook.events.participantLeft') return true;
        return undefined;
      });

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

    it('should close room when participant owner left the call', async () => {
      configService.get.mockImplementation((key) => {
        if (key === 'jitsiWebhook.events.participantLeft') return true;
        return undefined;
      });

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

    it('should not close room when participant that is not the owner left the call', async () => {
      configService.get.mockImplementation((key) => {
        if (key === 'jitsiWebhook.events.participantLeft') return true;
        return undefined;
      });

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

    it('should skip handling when participantLeftEnabled is false', async () => {
      configService.get.mockImplementation((key, defaultValue) => {
        if (key === 'jitsiWebhook.events.participantLeft') return false;
        return undefined;
      });

      // Create a new service instance with the updated config mock
      const testService = new JitsiWebhookService(configService, roomService);

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

      await testService.handleParticipantLeft(mockEvent);

      expect(roomService.removeUserFromRoom).not.toHaveBeenCalled();
    });

    it('should handle missing room ID in FQN', async () => {
      configService.get.mockImplementation((key, defaultValue) => {
        if (key === 'jitsiWebhook.events.participantLeft') return true;
        return undefined;
      });

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

    it('should handle missing participant ID', async () => {
      configService.get.mockImplementation((key, defaultValue) => {
        if (key === 'jitsiWebhook.events.participantLeft') return true;
        return undefined;
      });

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

    it('should handle errors thrown during processing', async () => {
      configService.get.mockImplementation((key, defaultValue) => {
        if (key === 'jitsiWebhook.events.participantLeft') return true;
        return undefined;
      });

      roomService.getRoomByRoomId.mockResolvedValueOnce(minimalRoom);

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

      const error = new Error('Failed to process');
      roomService.getRoomByRoomId.mockResolvedValue(minimalRoom);
      roomService.removeUserFromRoom.mockRejectedValue(error);

      await expect(service.handleParticipantLeft(mockEvent)).rejects.toThrow(
        error,
      );
    });
  });

  describe('validateWebhookRequest', () => {
    const mockPayload = {
      eventType: 'PARTICIPANT_LEFT',
    } as unknown as JitsiWebhookPayload;

    it('should skip validation if webhook secret is not configured', () => {
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

    it('should fail validation if signature is missing', () => {
      configService.get.mockImplementation((key, defaultValue) => {
        if (key === 'jitsiWebhook.secret') return 'webhook-secret';
        return defaultValue;
      });

      const testService = new JitsiWebhookService(configService, roomService);
      const headers = { 'content-type': 'application/json' };
      const rawBody = JSON.stringify({ test: 'data' });

      expect(testService.validateWebhookRequest(headers, mockPayload)).toBe(
        false,
      );
    });

    it('should fail validation if raw body is missing', () => {
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

    it('should validate correctly with valid signature', () => {
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

    it('should fail validation with invalid signature', () => {
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
