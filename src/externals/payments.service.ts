/* eslint-disable @typescript-eslint/restrict-template-expressions */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import jwt from 'jsonwebtoken';
import { HttpClient } from './http/http.service';
import { UUID } from 'crypto';

export interface Tier {
  id: string;
  label: string;
  productId: string;
  billingType: string;
  featuresPerService: {
    drive: {
      enabled: boolean;
      maxSpaceBytes: number;
      workspaces: {
        enabled: boolean;
        minimumSeats: number;
        maximumSeats: number;
        maxSpaceBytesPerSeat: number;
      };
    };
    backups: {
      enabled: boolean;
    };
    antivirus: {
      enabled: boolean;
    };
    meet: {
      enabled: boolean;
      paxPerCall: number;
    };
    mail: {
      enabled: boolean;
      addressesPerUser: number;
    };
    vpn: {
      enabled: boolean;
      featureId: UUID;
    };
  };
}

@Injectable()
export class PaymentService {
  constructor(
    @Inject(ConfigService)
    private readonly configService: ConfigService,
    @Inject(HttpClient)
    private readonly httpClient: HttpClient,
  ) {}

  async getUserTier(userUuid: string): Promise<Tier> {
    const isDevelopment = this.configService.get('isDevelopment');
    console.log(userUuid);

    const jwtToken = jwt.sign(
      { payload: { uuid: userUuid, workspaces: { owners: [userUuid] } } },
      this.configService.get('secrets.jwt'),
      {
        expiresIn: '5m',
        ...(isDevelopment ? { allowInsecureKeySizes: true } : null),
      },
    );

    const params = {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${jwtToken}`,
      },
    };

    const res = await this.httpClient.get(
      `${this.configService.get('apis.payments.url')}/products/tier`,
      params,
    );

    return res.data;
  }
}
