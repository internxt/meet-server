import {
  Inject,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import jwt, { JwtHeader } from 'jsonwebtoken';
import { v4 } from 'uuid';
import { PaymentService, Tier } from '../../../externals/payments.service';
import {
  getJitsiJWTHeader,
  getJitsiJWTPayload,
  getJitsiJWTSecret,
} from '../../../lib/jitsi';
import { UserTokenData } from '../../auth/dto/user.dto';
import { User } from '../../../shared/user/user.domain';
import { ConfigService } from '@nestjs/config';

export function SignWithRS256AndHeader(
  payload: object,
  secret: string,
  header: JwtHeader,
): string {
  return jwt.sign(payload, secret, { algorithm: 'RS256', header });
}

@Injectable()
export class CallService {
  constructor(
    @Inject(PaymentService)
    private readonly paymentService: PaymentService,
    private readonly configService: ConfigService,
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

  async createCall(user: User | UserTokenData['payload']) {
    const meetFeatures = await this.getMeetFeatureConfigForUser(user.uuid);

    if (!meetFeatures.enabled)
      throw new UnauthorizedException(
        'User does not have permission to create a call',
      );

    const newRoomId = v4();

    return {
      room: newRoomId,
      paxPerCall: meetFeatures.paxPerCall,
      appId: this.configService.get<string>('jitsi.appId'),
    };
  }

  generateJitsiJWT(
    user: {
      id: string;
      name: string;
      email: string;
      userRoomId: string;
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
}
