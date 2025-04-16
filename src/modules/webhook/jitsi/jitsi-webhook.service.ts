import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RoomUseCase } from '../../room/room.usecase';
import * as crypto from 'crypto';
import { RoomUserUseCase } from '../../room/room-user.usecase';
import { JitsiParticipantLeftWebHookPayload } from './interfaces/JitsiParticipantLeftData';
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

    try {
      this.logger.log(
        `Handling PARTICIPANT_LEFT event for participant: ${payload.data.id}`,
      );

      const roomId = this.extractRoomId(payload.fqn);

      if (!roomId) {
        this.logger.warn(`Could not extract room ID from FQN: ${payload.fqn}`);
        return;
      }

      const participantId = payload.data.id;

      if (!participantId) {
        this.logger.warn('Participant ID not found in payload');
        return;
      }

      const room = await this.roomUseCase.getRoomByRoomId(roomId);

      if (!room) {
        this.logger.warn(`Room with ID ${roomId} not found`);
        return;
      }

      await this.roomUserUseCase.removeUserFromRoom(participantId, room);

      this.logger.log(
        `Successfully processed PARTICIPANT_LEFT event for participant ${participantId} in room ${roomId}`,
      );
    } catch (error) {
      this.logger.error('Error handling PARTICIPANT_LEFT event', error);
      throw error;
    }
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
   * Validates if a webhook request is from Jitsi
   * @param headers The request headers
   * @param rawBody The raw request body (for signature validation)
   * @returns True if the request is valid
   */
  validateWebhookRequest(
    headers: Record<string, string>,
    rawBody?: string,
  ): boolean {
    if (!this.webhookSecret) {
      this.logger.warn('Webhook secret not configured, skipping validation');
      return true;
    }

    const signature = headers['x-jitsi-signature'];
    if (!signature) {
      this.logger.warn('No Jitsi signature found in headers');
      return false;
    }

    if (!rawBody) {
      this.logger.warn('No raw body provided for signature validation');
      return false;
    }

    const hmac = crypto.createHmac('sha256', this.webhookSecret);
    hmac.update(rawBody);
    const expectedSignature = hmac.digest('hex');

    const isValid = crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature),
    );

    if (!isValid) {
      this.logger.warn('Invalid webhook signature');
    }

    return isValid;
  }
}
