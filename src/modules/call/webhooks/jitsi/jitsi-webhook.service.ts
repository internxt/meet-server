import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import { RoomService } from '../../services/room.service';
import { JitsiWebhookPayload } from './interfaces/JitsiGenericWebHookPayload';
import { JitsiParticipantLeftWebHookPayload } from './interfaces/JitsiParticipantLeftData';
@Injectable()
export class JitsiWebhookService {
  private readonly logger = new Logger(JitsiWebhookService.name);
  private readonly webhookSecret: string | undefined;

  constructor(
    private readonly configService: ConfigService,
    private readonly roomService: RoomService,
  ) {
    this.webhookSecret = this.configService.get<string>('jitsiWebhook.secret');
  }

  /**
   * Handles the PARTICIPANT_LEFT event from Jitsi
   * @param payload The webhook payload
   * @returns A promise that resolves when the event is handled
   */
  async handleParticipantLeft(
    payload: JitsiParticipantLeftWebHookPayload,
  ): Promise<void> {
    try {
      this.logger.log({ payload }, 'Handling PARTICIPANT_LEFT event');

      const roomId = this.extractRoomId(payload.fqn);
      const [userId, roomUserId] = this.extractUserId(payload.data.id);

      if (!roomId) {
        this.logger.warn(`Could not extract room ID from FQN: ${payload.fqn}`);
        return;
      }

      const room = await this.roomService.getRoomByRoomId(roomId);

      if (!room) {
        this.logger.warn({ roomId }, 'Room not found');
        return;
      }

      const isOwner = userId === room.hostId;
      if (isOwner) await this.roomService.closeRoom(roomId);

      await this.roomService.deleteRoomUser(roomUserId);

      this.logger.log(
        { userId, roomId },
        'Successfully processed PARTICIPANT_LEFT event',
      );
    } catch (error: unknown) {
      this.logger.error({ error }, 'Error handling PARTICIPANT_LEFT event');
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
   * Validates if a webhook request is from Jitsi using JaaS signature format
   * @param headers The request headers
   * @param payload The webhook payload
   * @returns True if the request is valid
   */
  validateWebhookRequest(
    headers: Record<string, string>,
    payload: JitsiWebhookPayload,
  ): boolean {
    if (!this.webhookSecret) {
      this.logger.warn('Webhook secret not configured, skipping validation');
      return true;
    }

    const signature = headers['x-jaas-signature'];
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
      this.logger.error('Error validating webhook signature', error);
      return false;
    }
  }

  private extractUserId(contextUserId: string): [string, string] {
    const [userId, roomUserId] = contextUserId.split('/');

    return [userId, roomUserId];
  }
}
