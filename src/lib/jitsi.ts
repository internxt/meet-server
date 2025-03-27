/* eslint-disable @typescript-eslint/no-unsafe-call */
import { JwtHeader } from 'jsonwebtoken';
import configuration from 'src/config/configuration';
import { v4 } from 'uuid';

export const getJitsiJWTSecret = () => {
  return Buffer.from(configuration().secrets.jitsiSecret, 'base64').toString(
    'utf8',
  );
};

export const getJitsiJWTPayload = (
  user: {
    id: string;
    name: string;
    email: string;
  },
  room: string,
  moderator: boolean,
) => {
  const now = new Date();
  const appId = configuration().jitsi.appId;
  return {
    aud: 'jitsi',
    context: {
      user: {
        id: user?.id ?? v4(),
        name: user?.name ?? 'anonymous',
        email: user?.email ?? 'anonymous@internxt.com',
        avatar: '',
        moderator: moderator,
      },
      features: {
        livestreaming: false,
        recording: false,
        transcription: false,
        'outbound-call': false,
      },
    },
    iss: 'chat',
    room: room,
    sub: appId,
    exp: Math.round(now.setMinutes(now.getMinutes() + 1) / 1000),
    nbf: Math.round(new Date().getTime() / 1000) - 10,
  };
};

export const getJitsiJWTHeader = () => {
  const header: JwtHeader = {
    alg: 'RS256',
    kid: configuration().jitsi.apiKey,
    typ: 'JWT',
  };
  return header;
};
