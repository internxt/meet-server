import {
  Inject,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import jwt, { JwtHeader } from 'jsonwebtoken';
import { v4 } from 'uuid';
import configuration from '../../../config/configuration';
import { PaymentService, Tier } from '../../../externals/payments.service';
import {
  getJitsiJWTHeader,
  getJitsiJWTPayload,
  getJitsiJWTSecret,
} from '../../../lib/jitsi';
import { UserTokenData } from '../../auth/dto/user.dto';
import { UserDataForToken } from '../../../shared/user/user.attributes';
import { User } from '../../../shared/user/user.domain';

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
          // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
          `Failed to retrieve user tier from payment service: ${err?.message}`,
        );
        throw err;
      });

    const meetFeature = userFeatures.featuresPerService.meet;

    return meetFeature;
  }

  async createCallToken(user: User | UserTokenData['payload']) {
    const meetFeatures = await this.getMeetFeatureConfigForUser(user.uuid);

    if (!meetFeatures.enabled)
      throw new UnauthorizedException(
        'User does not have permission to create a call',
      );

    const newRoom = v4();
    const token = generateJitsiJWT(
      {
        id: user.uuid,
        email: user.email,
        name: `${user.name} ${user.lastname}`,
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
    user?: UserDataForToken,
  ) {
    const token = generateJitsiJWT(
      {
        id: userId,
        email: isAnonymous ? 'anonymous@inxt.com' : user.email,
        name: isAnonymous ? 'Anonymous' : `${user.name} ${user?.lastName}`,
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
