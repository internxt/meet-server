import { JwtHeader } from 'jsonwebtoken';
import { v4 } from 'uuid';
import configuration from '../config/configuration';

export const getJitsiJWTSecret = () => {
  const jitsiSecret = configuration().secrets.jitsiSecret;

  return Buffer.from(jitsiSecret, 'base64').toString('utf8');
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
  const now = Math.round(new Date().getTime() / 1000);
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
    sub: appId,
    room: room,
    exp: now + 60,
    nbf: now - 10,
    iat: now,
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
