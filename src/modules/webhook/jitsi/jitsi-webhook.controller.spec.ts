import { Test, TestingModule } from '@nestjs/testing';
import { JitsiWebhookController } from './jitsi-webhook.controller';
import { JitsiWebhookService } from './jitsi-webhook.service';
import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RequestWithRawBody } from './interfaces/request.interface';

describe('JitsiWebhookController', () => {
  let controller: JitsiWebhookController;
  let service: JitsiWebhookService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [JitsiWebhookController],
      providers: [
        {
          provide: JitsiWebhookService,
          useValue: {
            validateWebhookRequest: jest.fn(),
            handleParticipantLeft: jest.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<JitsiWebhookController>(JitsiWebhookController);
    service = module.get<JitsiWebhookService>(JitsiWebhookService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('handleWebhook', () => {
    it('should throw UnauthorizedException if webhook validation fails', async () => {
      const mockHeaders = { 'x-jitsi-signature': 'test-signature' };
      const mockRequest = {
        rawBody: Buffer.from('test-body'),
      } as RequestWithRawBody;
      const mockPayload = { eventType: 'PARTICIPANT_LEFT' };

      jest.spyOn(service, 'validateWebhookRequest').mockReturnValue(false);

      await expect(
        controller.handleWebhook(mockPayload, mockHeaders, mockRequest),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw BadRequestException if payload is missing eventType', async () => {
      const mockHeaders = { 'x-jitsi-signature': 'test-signature' };
      const mockRequest = {
        rawBody: Buffer.from('test-body'),
      } as RequestWithRawBody;
      const mockPayload = {};

      jest.spyOn(service, 'validateWebhookRequest').mockReturnValue(true);

      await expect(
        controller.handleWebhook(mockPayload, mockHeaders, mockRequest),
      ).rejects.toThrow(BadRequestException);
    });

    it('should handle PARTICIPANT_LEFT event', async () => {
      const mockHeaders = { 'x-jitsi-signature': 'test-signature' };
      const mockRequest = {
        rawBody: Buffer.from('test-body'),
      } as RequestWithRawBody;
      const mockPayload = { eventType: 'PARTICIPANT_LEFT' };

      jest.spyOn(service, 'validateWebhookRequest').mockReturnValue(true);
      jest
        .spyOn(service, 'handleParticipantLeft')
        .mockImplementation((): Promise<void> => Promise.resolve());

      const result = await controller.handleWebhook(
        mockPayload,
        mockHeaders,
        mockRequest,
      );

      expect(result).toEqual({ success: true });
      expect(service.handleParticipantLeft).toHaveBeenCalledWith(mockPayload);
    });

    it('should ignore unhandled event types', async () => {
      const mockHeaders = { 'x-jitsi-signature': 'test-signature' };
      const mockRequest = {
        rawBody: Buffer.from('test-body'),
      } as RequestWithRawBody;
      const mockPayload = { eventType: 'SOME_OTHER_EVENT' };

      jest.spyOn(service, 'validateWebhookRequest').mockReturnValue(true);

      const result = await controller.handleWebhook(
        mockPayload,
        mockHeaders,
        mockRequest,
      );

      expect(result).toEqual({ success: true });
      expect(service.handleParticipantLeft).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException if an error occurs during processing', async () => {
      const mockHeaders = { 'x-jitsi-signature': 'test-signature' };
      const mockRequest = {
        rawBody: Buffer.from('test-body'),
      } as RequestWithRawBody;
      const mockPayload = { eventType: 'PARTICIPANT_LEFT' };
      const mockError = new Error('Test error');

      jest.spyOn(service, 'validateWebhookRequest').mockReturnValue(true);
      jest
        .spyOn(service, 'handleParticipantLeft')
        .mockImplementation((): Promise<void> => Promise.reject(mockError));

      await expect(
        controller.handleWebhook(mockPayload, mockHeaders, mockRequest),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
