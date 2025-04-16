import { JitsiGenericWebHookPayload } from './JitsiGenericWebHookPayload';

export interface JitsiParticipantLeftData {
  moderator: boolean | 'true' | 'false';
  name: string;
  group?: string;
  email?: string;
  id?: string;
  participantJid?: string;
  participantId: string;
  avatar?: string;
  disconnectReason?:
    | 'left'
    | 'kicked'
    | 'unknown'
    | 'switch_room'
    | 'unrecoverable_error';
  participantName?: string;
  endpointId?: string;
}

export type JitsiParticipantLeftWebHookPayload =
  JitsiGenericWebHookPayload<JitsiParticipantLeftData>;
