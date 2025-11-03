import { createMock } from '@golevelup/ts-jest';
import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
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
  let configService: ConfigService;
  let moduleRef: TestingModule;

  beforeEach(async () => {
    moduleRef = await Test.createTestingModule({
      providers: [CallService],
    })
      .useMocker(createMock)
      .compile();

    callService = moduleRef.get<CallService>(CallService);
    paymentService = moduleRef.get<PaymentService>(PaymentService);
    configService = moduleRef.get<ConfigService>(ConfigService);

    jest.spyOn(configService, 'get').mockReturnValue('jitsi-app-id');
  });

  it('When the user has meet enabled, then a call should be created', async () => {
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

    const result = await callService.createCall(userPayload);

    expect(result).toEqual({
      appId: 'jitsi-app-id',
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

    await expect(callService.createCall(userPayload)).rejects.toThrow(
      UnauthorizedException,
    );

    expect(paymentService.getUserTier).toHaveBeenCalledWith(userPayload.uuid);
  });
});
