import {
  Inject,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import jwt, { JwtHeader } from 'jsonwebtoken';
import { v4 } from 'uuid';
import configuration from '../../config/configuration';
import { PaymentService, Tier } from '../../externals/payments.service';
import {
  getJitsiJWTHeader,
  getJitsiJWTPayload,
  getJitsiJWTSecret,
} from '../../lib/jitsi';
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
    const userFeatures = await this.paymentService
      .getUserTier(userUuid)
      .catch((err) => {
        Logger.error(
          `Failed to retrieve user tier from payment service: ${err.message}`,
        );
        throw err;
      });

    const meetFeature = userFeatures.featuresPerService.meet;

    return meetFeature;
  }

  async createCallToken(userUuid: string) {
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

    return {
      token,
      room: newRoom,
      paxPerCall: meetFeatures.paxPerCall,
      appId: configuration().jitsi.appId,
    };
  }

  createCallTokenForParticipant(
    userId: string,
    roomId: string,
    isAnonymous: boolean,
    isModerator: boolean,
  ) {
    const token = generateJitsiJWT(
      {
        id: userId,
        email: isAnonymous ? 'anonymous@inxt.com' : 'user@inxt.com',
        name: isAnonymous ? 'Anonymous' : 'User',
      },
      roomId,
      isModerator,
    );

    return {
      token,
      appId: configuration().jitsi.appId,
    };
  }
}
