import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import { RoomUserUseCase } from '../../room/room-user.usecase';
import { RoomUseCase } from '../../room/room.usecase';
import {
  JitsiGenericWebHookEvent,
  JitsiWebhookPayload,
  JitsiParticipantJoinedWebHookPayload,
} from './interfaces/JitsiGenericWebHookPayload';
import { JitsiParticipantLeftWebHookPayload } from './interfaces/JitsiParticipantLeftData';
import { Room } from '../../room/room.domain';

@Injectable()
export class JitsiWebhookService {
  private readonly logger = new Logger(JitsiWebhookService.name);
  private readonly webhookSecret: string | undefined;
  private readonly participantLeftEnabled: boolean;

  constructor(
    private readonly configService: ConfigService,
    private readonly roomUseCase: RoomUseCase,
    private readonly roomUserUseCase: RoomUserUseCase,
  ) {
    this.webhookSecret = this.configService.get<string>('jitsiWebhook.secret');
    this.participantLeftEnabled = this.configService.get<boolean>(
      'jitsiWebhook.events.participantLeft',
      true,
    );
  }

  /**
   * Handles webhook events by routing to the appropriate handler
   * @param payload The webhook payload
   */
  async handleWebhookEvent(payload: JitsiWebhookPayload): Promise<void> {
    switch (payload.eventType) {
      case JitsiGenericWebHookEvent.PARTICIPANT_LEFT:
        await this.handleParticipantLeft(
          payload as JitsiParticipantLeftWebHookPayload,
        );
        break;
      case JitsiGenericWebHookEvent.PARTICIPANT_JOINED:
        await this.handleParticipantJoined(
          payload as JitsiParticipantJoinedWebHookPayload,
        );
        break;
      default:
        this.logger.log(`Ignoring unhandled event type: ${payload.eventType}`);
        break;
    }
  }

  /**
   * Handles the PARTICIPANT_LEFT event from Jitsi
   * @param payload The webhook payload
   * @returns A promise that resolves when the event is handled
   */
  async handleParticipantLeft(
    payload: JitsiParticipantLeftWebHookPayload,
  ): Promise<void> {
    if (!this.participantLeftEnabled) {
      this.logger.log(
        'PARTICIPANT_LEFT event handling is disabled in configuration',
      );
      return;
    }

    this.logger.log(
      `Handling PARTICIPANT_LEFT event for participant: ${payload.data.id}`,
    );

    const roomData = await this.validateRoomContext(payload);
    if (!roomData) {
      return;
    }

    const { roomId, room, participantId } = roomData;
    const isOwner = participantId === room.hostId;

    if (isOwner) {
      await this.roomUseCase.closeRoom(roomId);
    }

    await this.roomUserUseCase.removeUserFromRoom(participantId, room);

    this.logger.log(
      { participantId, roomId },
      `Successfully processed PARTICIPANT_LEFT event`,
    );
  }

  /**
   * Handles the PARTICIPANT_JOINED event from Jitsi
   * @param payload The webhook payload
   */
  async handleParticipantJoined(
    payload: JitsiParticipantJoinedWebHookPayload,
  ): Promise<void> {
    const participantId = payload.data.id || payload.data.participantId;
    this.logger.log(
      `Handling PARTICIPANT_JOINED event for participant: ${participantId}`,
    );

    const roomData = await this.validateRoomContext(payload);
    if (!roomData) {
      return;
    }

    const { roomId, participantId: validatedParticipantId } = roomData;

    await this.roomUserUseCase.addUserToRoom(roomId, {
      userId: validatedParticipantId,
      name: payload.data.name,
    });

    this.logger.log(
      { participantId: validatedParticipantId, roomId },
      `Successfully processed PARTICIPANT_JOINED event`,
    );
  }

  /**
   * Validates room context from webhook payload
   * @param payload The webhook payload
   * @returns Object with roomId, room, and participantId or null if validation fails
   */
  private async validateRoomContext(payload: {
    fqn: string;
    data: { id?: string; participantId?: string };
  }): Promise<{
    roomId: string;
    room: Room;
    participantId: string;
  } | null> {
    const roomId = this.extractRoomId(payload.fqn);
    if (!roomId) {
      this.logger.warn({ payload }, 'Could not extract room ID from payload');
      return null;
    }

    const participantId = payload.data.id || payload.data.participantId;
    if (!participantId) {
      this.logger.warn('Participant ID not found in payload');
      return null;
    }

    const room = await this.roomUseCase.getRoomByRoomId(roomId);
    if (!room) {
      this.logger.warn({ roomId }, 'Room not found');
      return null;
    }

    return { roomId, room, participantId };
  }

  /**
   * Extracts the room ID from the Jitsi Fully Qualified Name (FQN)
   * @param fqn The fully qualified name in format "appId/roomName"
   * @returns The room name/ID
   */
  private extractRoomId(fqn: string): string | null {
    if (!fqn) {
      return null;
    }

    const parts = fqn.split('/');
    if (parts.length < 2) {
      return null;
    }

    return parts[parts.length - 1];
  }

  /**
   * Validates if a webhook request is from Jitsi using JaaS signature format
   * @param headers The request headers
   * @param payload The webhook payload
   * @returns True if the request is valid
   */
  validateWebhookRequest(
    signature: string,
    payload: JitsiWebhookPayload,
  ): boolean {
    if (!this.webhookSecret) {
      this.logger.warn('Webhook secret not configured, skipping validation');
      return true;
    }

    if (!signature) {
      this.logger.warn('No Jitsi signature found in headers');
      return false;
    }

    if (!payload) {
      this.logger.warn('No payload provided for signature validation');
      return false;
    }

    try {
      // Parse JaaS signature format: t=timestamp,v1=signature
      const parts = signature.split(',');
      let timestamp: string | undefined;
      let v1Signature: string | undefined;

      for (const part of parts) {
        const [prefix, value] = part.split('=', 2);
        if (prefix === 't' && value) {
          timestamp = value;
        } else if (prefix === 'v1' && value) {
          v1Signature = value;
        }
      }

      if (!timestamp || !v1Signature) {
        this.logger.warn('Invalid JaaS signature format');
        return false;
      }

      const signedPayload = `${timestamp}.${JSON.stringify(payload)}`;
      const expectedSignature = crypto
        .createHmac('sha256', this.webhookSecret)
        .update(signedPayload, 'utf8')
        .digest('base64');

      return crypto.timingSafeEqual(
        Buffer.from(v1Signature, 'base64'),
        Buffer.from(expectedSignature, 'base64'),
      );
    } catch (error) {
      this.logger.error(error, 'Error validating webhook signature');
      return false;
    }
  }
}
