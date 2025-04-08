import { UnauthorizedException } from '@nestjs/common';
import { CallService } from './call.service';
import { PaymentService, Tier } from '../../externals/payments.service';
import * as uuid from 'uuid';
import * as jwt from 'jsonwebtoken';
import { Test } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import configuration from '../../config/configuration';
import { createMock, DeepMocked } from '@golevelup/ts-jest';

jest.mock('uuid');
jest.mock('jsonwebtoken');

describe('Call service', () => {
  let callService: CallService;
  let paymentService: DeepMocked<PaymentService>;

  beforeEach(async () => {
    paymentService = createMock<PaymentService>();

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
          useValue: paymentService,
        },
        CallService,
      ],
    }).compile();

    callService = module.get<CallService>(CallService);
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

  describe('createCallTokenForParticipant', () => {
    it('should create a token for a registered user', () => {
      const userId = 'test-user-id';
      const roomId = 'test-room-id';
      const isAnonymous = false;
      const expectedToken = 'test-participant-token';

      (jwt.sign as jest.Mock).mockReturnValue(expectedToken);

      const result = callService.createCallTokenForParticipant(
        userId,
        roomId,
        isAnonymous,
      );

      expect(result).toBe(expectedToken);
      expect(jwt.sign).toHaveBeenCalled();
    });

    it('should create a token for an anonymous user', () => {
      const userId = 'anonymous-user-id';
      const roomId = 'test-room-id';
      const isAnonymous = true;
      const expectedToken = 'test-anonymous-token';

      (jwt.sign as jest.Mock).mockReturnValue(expectedToken);

      const result = callService.createCallTokenForParticipant(
        userId,
        roomId,
        isAnonymous,
      );

      expect(result).toBe(expectedToken);
      expect(jwt.sign).toHaveBeenCalled();
    });
  });
});
