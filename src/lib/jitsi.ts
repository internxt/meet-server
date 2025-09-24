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
    userRoomId: string;
  },
  room: string,
  moderator: boolean,
) => {
  const now = Math.round(new Date().getTime() / 1000);
  const appId = configuration().jitsi.appId;
  const userContextId = user.id + '/' + user.userRoomId;

  return {
    aud: 'jitsi',
    context: {
      user: {
        id: userContextId,
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

export const getJitsiAdminJWTPayload = () => {
  const now = Math.round(new Date().getTime() / 1000);
  const appId = configuration().jitsi.appId;

  return {
    aud: 'jitsi',
    exp: now + 600, // 1 minute expiration
    iss: 'chat',
    admin: true, // Required for conference management endpoints
    sub: appId,
  };
};
