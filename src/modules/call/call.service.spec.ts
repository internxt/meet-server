import { UnauthorizedException } from '@nestjs/common';
import { CallService } from './call.service';
import { PaymentService, Tier } from '../../externals/payments.service';
import * as uuid from 'uuid';
import * as jwt from 'jsonwebtoken';
import { Test } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import configuration from '../../config/configuration';

jest.mock('uuid');
jest.mock('jsonwebtoken');

describe('Call service', () => {
  let callService: CallService;
  let paymentService: PaymentService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          envFilePath: [`.env.${process.env.NODE_ENV}`],
          load: [configuration],
          isGlobal: true,
        }),
      ],
      providers: [
        {
          provide: PaymentService,
          useValue: {
            getUserTier: jest.fn(),
          },
        },
        CallService,
      ],
    }).compile();

    callService = module.get<CallService>(CallService);
    paymentService = module.get<PaymentService>(PaymentService);
  });

  it('When the user has meet enabled, then a call token should be created', async () => {
    const getUserTierSpy = jest
      .spyOn(paymentService, 'getUserTier')
      .mockResolvedValue({
        featuresPerService: {
          meet: {
            enabled: true,
            paxPerCall: 10,
          },
        },
      } as Tier);

    (uuid.v4 as jest.Mock).mockReturnValue('test-room-id');
    (jwt.sign as jest.Mock).mockReturnValue('test-jitsi-token');

    const result = await callService.createCallToken('user-123');

    expect(result).toEqual({
      token: 'test-jitsi-token',
      room: 'test-room-id',
      paxPerCall: 10,
    });

    expect(getUserTierSpy).toHaveBeenCalledWith('user-123');
  });

  it('When the user does not have meet enabled, then an error indicating so is thrown', async () => {
    const getUserTierSpy = jest
      .spyOn(paymentService, 'getUserTier')
      .mockResolvedValue({
        featuresPerService: {
          meet: {
            enabled: false,
            paxPerCall: 0,
          },
        },
      } as Tier);

    await expect(callService.createCallToken('user-123')).rejects.toThrow(
      UnauthorizedException,
    );

    expect(getUserTierSpy).toHaveBeenCalledWith('user-123');
  });
});
