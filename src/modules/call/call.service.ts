/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { v4 } from 'uuid';
import { PaymentService, Tier } from 'src/externals/payments.service';
import jwt, { JwtHeader } from 'jsonwebtoken';
import {
  getJitsiJWTHeader,
  getJitsiJWTPayload,
  getJitsiJWTSecret,
} from 'src/lib/jitsi';

export function SignWithRS256AndHeader(
  payload: object,
  secret: string,
  header: JwtHeader,
): string {
  return jwt.sign(payload, secret, { algorithm: 'RS256', header });
}

export function generateJitsiJWT(
  user: {
    id: string;
    name: string;
    email: string;
  },
  room: string,
  moderator: boolean,
) {
  return SignWithRS256AndHeader(
    getJitsiJWTPayload(user, room, moderator),
    getJitsiJWTSecret(),
    getJitsiJWTHeader(),
  );
}

@Injectable()
export class CallService {
  constructor(
    @Inject(PaymentService)
    private readonly paymentService: PaymentService,
  ) {}

  private async getMeetFeatureConfigForUser(
    userUuid: string,
  ): Promise<Tier['featuresPerService']['meet']> {
    const userFeatures = await this.paymentService.getUserTier(userUuid);
    const meetFeature = userFeatures.featuresPerService.meet;

    return meetFeature;
  }

  async createCall(userUuid: string) {
    const meetFeatures = await this.getMeetFeatureConfigForUser(userUuid);

    if (!meetFeatures.enabled)
      throw new UnauthorizedException(
        'User does not have permission to create a call',
      );

    const newRoom = v4();
    const token = generateJitsiJWT(
      {
        id: userUuid,
        email: 'example@inxt.com',
        name: 'Example',
      },
      newRoom,
      true,
    );

    return { token, room: newRoom };
  }
}
