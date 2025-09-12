export enum JitsiGenericWebHookEvent {
  ROOM_CREATED = 'ROOM_CREATED',
  PARTICIPANT_LEFT = 'PARTICIPANT_LEFT',
  PARTICIPANT_LEFT_LOBBY = 'PARTICIPANT_LEFT_LOBBY',
  TRANSCRIPTION_UPLOADED = 'TRANSCRIPTION_UPLOADED',
  CHAT_UPLOADED = 'CHAT_UPLOADED',
  ROOM_DESTROYED = 'ROOM_DESTROYED',
  PARTICIPANT_JOINED = 'PARTICIPANT_JOINED',
  PARTICIPANT_JOINED_LOBBY = 'PARTICIPANT_JOINED_LOBBY',
  RECORDING_STARTED = 'RECORDING_STARTED',
  RECORDING_ENDED = 'RECORDING_ENDED',
  RECORDING_UPLOADED = 'RECORDING_UPLOADED',
  LIVE_STREAM_STARTED = 'LIVE_STREAM_STARTED',
  LIVE_STREAM_ENDED = 'LIVE_STREAM_ENDED',
  SETTINGS_PROVISIONING = 'SETTINGS_PROVISIONING',
  SIP_CALL_IN_STARTED = 'SIP_CALL_IN_STARTED',
  SIP_CALL_IN_ENDED = 'SIP_CALL_IN_ENDED',
  SIP_CALL_OUT_STARTED = 'SIP_CALL_OUT_STARTED',
  SIP_CALL_OUT_ENDED = 'SIP_CALL_OUT_ENDED',
  FEEDBACK = 'FEEDBACK',
  DIAL_IN_STARTED = 'DIAL_IN_STARTED',
  DIAL_IN_ENDED = 'DIAL_IN_ENDED',
  DIAL_OUT_STARTED = 'DIAL_OUT_STARTED',
  DIAL_OUT_ENDED = 'DIAL_OUT_ENDED',
  USAGE = 'USAGE',
  SPEAKER_STATS = 'SPEAKER_STATS',
  POLL_CREATED = 'POLL_CREATED',
  POLL_ANSWER = 'POLL_ANSWER',
  REACTIONS = 'REACTIONS',
  AGGREGATED_REACTIONS = 'AGGREGATED_REACTIONS',
  SCREEN_SHARING_HISTORY = 'SCREEN_SHARING_HISTORY',
  VIDEO_SEGMENT_UPLOADED = 'VIDEO_SEGMENT_UPLOADED',
  ROLE_CHANGED = 'ROLE_CHANGED',
  RTCSTATS_UPLOADED = 'RTCSTATS_UPLOADED',
  TRANSCRIPTION_CHUNK_RECEIVED = 'TRANSCRIPTION_CHUNK_RECEIVED',
}

export interface JitsiGenericWebHookPayload<T = any> {
  idempotencyKey: string;
  customerId: string;
  appId: string;
  eventType: JitsiGenericWebHookEvent;
  sessionId: string;
  timestamp: number;
  fqn: string;
  data: T;
}

export interface JitsiParticipantLeftData {
  moderator: boolean | 'true' | 'false';
  name: string;
  group?: string;
  email?: string;
  id?: string;
  participantJid: string;
  participantId: string;
  avatar?: string;
  disconnectReason:
    | 'left'
    | 'kicked'
    | 'unknown'
    | 'switch_room'
    | 'unrecoverable_error';
  isBreakout?: boolean;
  breakoutRoomId?: string;
}

export type JitsiParticipantLeftWebHookPayload =
  JitsiGenericWebHookPayload<JitsiParticipantLeftData>;

export interface JitsiParticipantJoinedData {
  moderator: boolean | 'true' | 'false';
  name: string;
  group?: string;
  email?: string;
  id?: string;
  participantJid: string;
  participantId: string;
  avatar?: string;
  isBreakout?: boolean;
  breakoutRoomId?: string;
}

export type JitsiParticipantJoinedWebHookPayload =
  JitsiGenericWebHookPayload<JitsiParticipantJoinedData>;

export interface JitsiRoomCreatedData {
  conference: string;
  isBreakout?: boolean;
  breakoutRoomId?: string;
}

export type JitsiRoomCreatedWebHookPayload =
  JitsiGenericWebHookPayload<JitsiRoomCreatedData>;

export interface JitsiRoomDestroyedData {
  conference: string;
  isBreakout?: boolean;
  breakoutRoomId?: string;
}

export type JitsiRoomDestroyedWebHookPayload =
  JitsiGenericWebHookPayload<JitsiRoomDestroyedData>;

export type JitsiWebhookPayload =
  | JitsiParticipantLeftWebHookPayload
  | JitsiParticipantJoinedWebHookPayload
  | JitsiRoomCreatedWebHookPayload
  | JitsiRoomDestroyedWebHookPayload;
