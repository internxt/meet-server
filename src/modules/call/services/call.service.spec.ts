import { createMock } from '@golevelup/ts-jest';
import { UnauthorizedException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import * as jwt from 'jsonwebtoken';
import * as uuid from 'uuid';
import { PaymentService, Tier } from '../../../externals/payments.service';
import { CallService } from './call.service';
import { mockUserPayload } from '../fixtures';

jest.mock('uuid');
jest.mock('jsonwebtoken');
jest.mock('../../../lib/jitsi', () => ({
  getJitsiJWTSecret: jest.fn(() => 'mock-secret'),
  getJitsiJWTHeader: jest.fn(() => ({ alg: 'RS256', typ: 'JWT' })),
  getJitsiJWTPayload: jest.fn(() => ({ iss: 'jitsi', aud: 'jitsi' })),
}));

jest.mock('../../../config/configuration', () => {
  return jest.fn(() => ({
    jitsi: {
      appId: 'jitsi-app-id',
    },
  }));
});

describe('Call service', () => {
  let callService: CallService;
  let paymentService: PaymentService;
  let moduleRef: TestingModule;

  beforeEach(async () => {
    moduleRef = await Test.createTestingModule({
      providers: [CallService],
    })
      .useMocker(createMock)
      .compile();

    callService = moduleRef.get<CallService>(CallService);
    paymentService = moduleRef.get<PaymentService>(PaymentService);
  });

  it('When the user has meet enabled, then a call token should be created', async () => {
    const userPayload = mockUserPayload;
    jest.spyOn(paymentService, 'getUserTier').mockResolvedValue({
      featuresPerService: {
        meet: {
          enabled: true,
          paxPerCall: 10,
        },
      },
    } as Tier);

    (uuid.v4 as jest.Mock).mockReturnValue('test-room-id');
    (jwt.sign as jest.Mock).mockReturnValue('test-jitsi-token');

    const result = await callService.createCallToken(userPayload);

    expect(result).toEqual({
      appId: 'jitsi-app-id',
      token: 'test-jitsi-token',
      room: 'test-room-id',
      paxPerCall: 10,
    });

    expect(paymentService.getUserTier).toHaveBeenCalledWith(userPayload.uuid);
  });

  it('When the user does not have meet enabled, then an error indicating so is thrown', async () => {
    const userPayload = mockUserPayload;
    jest.spyOn(paymentService, 'getUserTier').mockResolvedValue({
      featuresPerService: {
        meet: {
          enabled: false,
          paxPerCall: 0,
        },
      },
    } as Tier);

    await expect(callService.createCallToken(userPayload)).rejects.toThrow(
      UnauthorizedException,
    );

    expect(paymentService.getUserTier).toHaveBeenCalledWith(userPayload.uuid);
  });

  describe('createCallTokenForParticipant', () => {
    it('should create a token for a registered user (non-moderator)', () => {
      const userPayload = mockUserPayload;
      const userId = userPayload.uuid;
      const roomId = 'test-room-id';
      const isAnonymous = false;
      const isModerator = false;
      const expectedToken = 'test-participant-token';

      (jwt.sign as jest.Mock).mockReturnValue(expectedToken);

      const result = callService.createCallTokenForParticipant(
        userId,
        roomId,
        isAnonymous,
        isModerator,
        userPayload,
      );

      expect(result).toStrictEqual({
        appId: 'jitsi-app-id',
        token: expectedToken,
      });
      expect(jwt.sign).toHaveBeenCalled();
    });

    it('should create a token for an anonymous user (non-moderator)', () => {
      const userId = 'anonymous-user-id';
      const roomId = 'test-room-id';
      const isAnonymous = true;
      const isModerator = false;
      const expectedToken = 'test-anonymous-token';

      (jwt.sign as jest.Mock).mockReturnValue(expectedToken);

      const result = callService.createCallTokenForParticipant(
        userId,
        roomId,
        isAnonymous,
        isModerator,
      );

      expect(result).toStrictEqual({
        appId: 'jitsi-app-id',
        token: expectedToken,
      });
      expect(jwt.sign).toHaveBeenCalled();
    });

    it('should create a token for a moderator user', () => {
      const userId = 'moderator-user-id';
      const roomId = 'test-room-id';
      const isAnonymous = false;
      const isModerator = true;
      const expectedToken = 'test-moderator-token';

      (jwt.sign as jest.Mock).mockReturnValue(expectedToken);

      const result = callService.createCallTokenForParticipant(
        userId,
        roomId,
        isAnonymous,
        isModerator,
        mockUserPayload,
      );

      expect(result).toStrictEqual({
        appId: 'jitsi-app-id',
        token: expectedToken,
      });
      expect(jwt.sign).toHaveBeenCalled();
    });
  });
});
