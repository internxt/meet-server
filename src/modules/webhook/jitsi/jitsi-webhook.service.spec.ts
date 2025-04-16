import { createMock, DeepMocked } from '@golevelup/ts-jest';
import { Test, TestingModule } from '@nestjs/testing';
import { JitsiWebhookService } from './jitsi-webhook.service';
import { JitsiParticipantLeftWebHookPayload } from './interfaces/JitsiParticipantLeftData';
import { ConfigService } from '@nestjs/config';
import { RoomUseCase } from '../../room/room.usecase';
import { RoomUserUseCase } from '../../room/room-user.usecase';
import { Logger } from '@nestjs/common';
import * as crypto from 'crypto';
import { JitsiGenericWebHookEvent } from './interfaces/JitsiGenericWebHookPayload';
import { Room } from '../../room/room.domain';

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
  let roomUseCase: DeepMocked<RoomUseCase>;
  let roomUserUseCase: DeepMocked<RoomUserUseCase>;
  let configService: DeepMocked<ConfigService>;

  const minimalRoom = new Room({
    id: 'test-room-id',
    maxUsersAllowed: 10,
    hostId: 'host-id',
  });

  beforeEach(async () => {
    roomUseCase = createMock<RoomUseCase>();
    roomUserUseCase = createMock<RoomUserUseCase>();
    configService = createMock<ConfigService>();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JitsiWebhookService,
        {
          provide: ConfigService,
          useValue: configService,
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

    service = module.get<JitsiWebhookService>(JitsiWebhookService);

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

      roomUseCase.getRoomByRoomId.mockResolvedValueOnce(minimalRoom);

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

      const removeUserFromRoomSpy = jest
        .spyOn(roomUserUseCase, 'removeUserFromRoom')
        .mockResolvedValueOnce(undefined);

      await service.handleParticipantLeft(mockEvent);

      expect(removeUserFromRoomSpy).toHaveBeenCalledWith(
        'test-participant-id',
        minimalRoom,
      );
    });

    it('should skip handling when participantLeftEnabled is false', async () => {
      configService.get.mockImplementation((key, defaultValue) => {
        if (key === 'jitsiWebhook.events.participantLeft') return false;
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
          id: 'test-participant-id',
          participantJid: 'test-jid',
          participantId: 'test-participant-id',
        },
      };

      service = new JitsiWebhookService(
        configService,
        roomUseCase,
        roomUserUseCase,
      );

      const removeUserFromRoomSpy = jest
        .spyOn(roomUserUseCase, 'removeUserFromRoom')
        .mockResolvedValueOnce(undefined);

      await service.handleParticipantLeft(mockEvent);

      expect(removeUserFromRoomSpy).not.toHaveBeenCalled();
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

      const removeUserFromRoomSpy = jest
        .spyOn(roomUserUseCase, 'removeUserFromRoom')
        .mockResolvedValueOnce(undefined);

      await service.handleParticipantLeft(mockEvent);

      expect(removeUserFromRoomSpy).not.toHaveBeenCalled();
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

      const removeUserFromRoomSpy = jest
        .spyOn(roomUserUseCase, 'removeUserFromRoom')
        .mockResolvedValueOnce(undefined);

      await service.handleParticipantLeft(mockEvent);

      expect(removeUserFromRoomSpy).not.toHaveBeenCalled();
    });

    it('should handle errors thrown during processing', async () => {
      configService.get.mockImplementation((key, defaultValue) => {
        if (key === 'jitsiWebhook.events.participantLeft') return true;
        return undefined;
      });

      roomUseCase.getRoomByRoomId.mockResolvedValueOnce(minimalRoom);

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
      jest
        .spyOn(roomUserUseCase, 'removeUserFromRoom')
        .mockRejectedValueOnce(error);

      await expect(service.handleParticipantLeft(mockEvent)).rejects.toThrow(
        error,
      );
    });
  });

  describe('validateWebhookRequest', () => {
    it('should skip validation if webhook secret is not configured', () => {
      configService.get.mockImplementation((key, defaultValue) => {
        if (key === 'jitsiWebhook.secret') return undefined;
        return defaultValue;
      });

      service = new JitsiWebhookService(
        configService,
        roomUseCase,
        roomUserUseCase,
      );

      const headers = { 'content-type': 'application/json' };
      const rawBody = JSON.stringify({ test: 'data' });

      expect(service.validateWebhookRequest(headers, rawBody)).toBe(true);
    });

    it('should fail validation if signature is missing', () => {
      configService.get.mockImplementation((key, defaultValue) => {
        if (key === 'jitsiWebhook.secret') return 'webhook-secret';
        return defaultValue;
      });

      service = new JitsiWebhookService(
        configService,
        roomUseCase,
        roomUserUseCase,
      );

      const headers = { 'content-type': 'application/json' };
      const rawBody = JSON.stringify({ test: 'data' });

      expect(service.validateWebhookRequest(headers, rawBody)).toBe(false);
    });

    it('should fail validation if raw body is missing', () => {
      configService.get.mockImplementation((key, defaultValue) => {
        if (key === 'jitsiWebhook.secret') return 'webhook-secret';
        return defaultValue;
      });

      service = new JitsiWebhookService(
        configService,
        roomUseCase,
        roomUserUseCase,
      );

      const headers = {
        'content-type': 'application/json',
        'x-jitsi-signature': 'signature',
      };

      expect(service.validateWebhookRequest(headers)).toBe(false);
    });

    it('should validate correctly with valid signature', () => {
      const secret = 'webhook-secret';
      configService.get.mockImplementation((key, defaultValue) => {
        if (key === 'jitsiWebhook.secret') return secret;
        return defaultValue;
      });

      service = new JitsiWebhookService(
        configService,
        roomUseCase,
        roomUserUseCase,
      );

      const rawBody = JSON.stringify({ test: 'data' });
      const signature = 'mocked-signature';

      const headers = {
        'content-type': 'application/json',
        'x-jitsi-signature': signature,
      };

      (crypto.timingSafeEqual as jest.Mock).mockReturnValue(true);

      expect(service.validateWebhookRequest(headers, rawBody)).toBe(true);
    });

    it('should fail validation with invalid signature', () => {
      const secret = 'webhook-secret';
      configService.get.mockImplementation((key, defaultValue) => {
        if (key === 'jitsiWebhook.secret') return secret;
        return defaultValue;
      });

      service = new JitsiWebhookService(
        configService,
        roomUseCase,
        roomUserUseCase,
      );

      const rawBody = JSON.stringify({ test: 'data' });
      const headers = {
        'content-type': 'application/json',
        'x-jitsi-signature': 'invalid-signature',
      };

      (crypto.timingSafeEqual as jest.Mock).mockReturnValue(false);

      expect(service.validateWebhookRequest(headers, rawBody)).toBe(false);
    });
  });
});
