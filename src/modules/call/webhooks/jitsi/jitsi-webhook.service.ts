import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Sequelize } from 'sequelize-typescript';
import * as crypto from 'crypto';
import { RoomService } from '../../services/room.service';
import { SequelizeRoomUserRepository } from '../../infrastructure/room-user.repository';
import {
  JitsiWebhookPayload,
  JitsiParticipantJoinedWebHookPayload,
} from './interfaces/JitsiGenericWebHookPayload';
import { JitsiParticipantLeftWebHookPayload } from './interfaces/JitsiParticipantLeftData';
import { CallService } from '../../services/call.service';
@Injectable()
export class JitsiWebhookService {
  private readonly logger = new Logger(JitsiWebhookService.name);
  private readonly webhookSecret: string | undefined;

  constructor(
    private readonly callService: CallService,

    private readonly roomService: RoomService,
    private readonly roomUserRepository: SequelizeRoomUserRepository,
    private readonly sequelize: Sequelize,
    private readonly configService: ConfigService,
  ) {
    this.webhookSecret = this.configService.get<string>('jitsiWebhook.secret');
  }

  /**
   * Handles the PARTICIPANT_JOINED event from Jitsi
   * @param payload The webhook payload
   * @returns A promise that resolves when the event is handled
   */
  async handleParticipantJoined(
    payload: JitsiParticipantJoinedWebHookPayload,
  ): Promise<void> {
    try {
      this.logger.log(
        {
          payload,
        },
        'Handling PARTICIPANT_JOINED event',
      );

      const roomId = this.extractRoomId(payload.fqn);
      if (!roomId) {
        this.logger.warn(`Could not extract room ID from FQN: ${payload.fqn}`);
        return;
      }

      const room = await this.roomService.getRoomByRoomId(roomId);
      if (!room) {
        this.logger.warn({ roomId }, 'Room not found');
        return;
      }

      const [userId, roomUserId] = this.extractUserId(payload.data.id);
      const newParticipantId = payload.data.participantId;
      const webhookTimestamp = new Date(payload.timestamp);

      if (!newParticipantId || !userId) {
        this.logger.warn(
          { participantId: newParticipantId, userId },
          'Participant ID or user ID not found in payload',
        );
        return;
      }

      let participantToKick: string | undefined;

      await this.sequelize.transaction(async (transaction) => {
        const roomUser = await this.roomUserRepository.findById(roomUserId, {
          transaction,
          lock: true,
        });

        if (!roomUser) {
          this.logger.warn({ roomUserId }, 'Room user not found for webhook');
          return;
        }

        const isFirstConnection = !roomUser.joinedAt && !roomUser.participantId;

        if (isFirstConnection) {
          await this.roomUserRepository.update(
            roomUserId,
            {
              participantId: newParticipantId,
              joinedAt: webhookTimestamp,
            },
            transaction,
          );
          return;
        }

        if (webhookTimestamp > roomUser.joinedAt) {
          if (roomUser?.participantId !== newParticipantId) {
            participantToKick = roomUser.participantId;
          }

          await this.roomUserRepository.update(
            roomUserId,
            {
              participantId: newParticipantId,
              joinedAt: webhookTimestamp,
            },
            transaction,
          );
          return;
        }

        participantToKick = newParticipantId;
        this.logger.warn(
          {
            roomUserId,
            webhookTimestamp,
            currentJoinedAt: roomUser.joinedAt,
            obsoleteParticipantId: newParticipantId,
          },
          'Received obsolete participant joined webhook',
        );
      });

      if (participantToKick) {
        this.logger.log(
          {
            roomId,
            participantToKick,
          },
          'Kicking participant due to webhook processing',
        );
        await this.callService.kickParticipant(roomId, participantToKick);
      }

      this.logger.log(
        {
          participantId: newParticipantId,
          userId,
          roomId,
          webhookTimestamp,
          roomUserId,
        },
        'Successfully processed PARTICIPANT_JOINED event',
      );
    } catch (error: unknown) {
      this.logger.error({ error }, 'Error handling PARTICIPANT_JOINED event');
      throw error;
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

      const webhookTimestamp = new Date(payload.timestamp);
      const deletedRows =
        await this.roomUserRepository.deleteByParticipantAndTimestamp(
          roomUserId,
          payload.data.participantId,
          webhookTimestamp,
        );

      if (deletedRows > 0) {
        const isOwner = userId === room.hostId;
        if (isOwner) {
          await this.roomService.closeRoom(roomId);
        }
      }

      const remainingUsers = await this.roomService.countUsersInRoom(roomId);
      if (remainingUsers === 0) {
        await this.roomService.removeRoom(roomId);
      }

      this.logger.log(
        { userId, roomId, removedRoomUsers: deletedRows },
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
