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
  getJitsiAdminJWTPayload,
  getJitsiJWTHeader,
  getJitsiJWTPayload,
  getJitsiJWTSecret,
} from '../../../lib/jitsi';
import { UserTokenData } from '../../auth/dto/user.dto';
import { User } from '../../../shared/user/user.domain';
import { ConfigService } from '@nestjs/config';
import { HttpClient } from '../../../externals/http/http.service';

export function SignWithRS256AndHeader(
  payload: object,
  secret: string,
  header: JwtHeader,
): string {
  return jwt.sign(payload, secret, { algorithm: 'RS256', header });
}

@Injectable()
export class CallService {
  private readonly logger = new Logger(CallService.name);

  private readonly apiUrl: string;
  private readonly appId: string;
  private readonly jwtSecret: string;

  constructor(
    @Inject(PaymentService)
    private readonly paymentService: PaymentService,
    private readonly configService: ConfigService,
    private readonly httpService: HttpClient,
  ) {
    this.apiUrl = this.configService.get<string>('jitsi.apiUrl');
    this.appId = this.configService.get<string>('jitsi.appId');
    this.jwtSecret = getJitsiJWTSecret();
  }

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

  async kickParticipant(roomId: string, participantId: string): Promise<void> {
    try {
      const token = this.generateAdminToken();
      const conferenceFullName = this.formatConferenceFullName(roomId);
      const url = `${this.apiUrl}/v1/_jaas/conference-commands/v1/meeting`;

      const requestBody = {
        action: 'KICK_PARTICIPANT',
        payload: {
          conferenceFullName,
          participantId,
        },
      };

      this.logger.debug(
        { requestBody, conferenceFullName },
        'Sending kick participant request to JaaS API',
      );

      const response = await this.httpService.post(url, requestBody, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
          Accept: '*/*',
        },
      });

      this.logger.log(
        { roomId, participantId, status: response.status },
        'Successfully kicked participant from Jitsi room',
      );
    } catch (error: unknown) {
      if (error instanceof Error) {
        this.logger.error(
          {
            roomId,
            participantId,
            error: error.message,
            stack: error.stack,
          },
          'Failed to kick participant from Jitsi room',
        );
      }
      throw error;
    }
  }

  /**
   * Generates an admin JWT token for JaaS API authentication
   * @returns JWT token string
   */
  private generateAdminToken(): string {
    const payload = getJitsiAdminJWTPayload();
    const header = getJitsiJWTHeader();

    return jwt.sign(payload, this.jwtSecret, {
      algorithm: 'RS256',
      header,
    });
  }

  /**
   * Formats a room ID into the required conference full name format
   * @param roomId The simple room ID
   * @returns Conference full name in format: roomId@conference.appId.8x8.vc
   */
  private formatConferenceFullName(roomId: string): string {
    return `${roomId}@conference.${this.appId}.8x8.vc`;
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
