import {
  Injectable,
  Logger,
  BadRequestException,
  ConflictException,
  InternalServerErrorException,
} from '@nestjs/common';
import { CallService } from './call.service';
import { RoomUseCase } from '../room/room.usecase';

export interface CallResponse {
  token: string;
  room: string;
  paxPerCall: number;
}

@Injectable()
export class CallUseCase {
  private readonly logger = new Logger(CallUseCase.name);

  constructor(
    private readonly callService: CallService,
    private readonly roomUseCase: RoomUseCase,
  ) {}

  async validateUserHasNoActiveRoom(
    uuid: string,
    email: string,
  ): Promise<void> {
    try {
      const existingRoom = await this.roomUseCase.getRoomByHostId(uuid);
      if (existingRoom) {
        this.logger.warn(
          `User ${email} already has an active room as host: ${existingRoom.id}`,
        );
        throw new ConflictException('User already has an active room as host');
      }
    } catch (error) {
      if (error instanceof ConflictException) {
        throw error;
      }
      const err = error as Error;
      this.logger.error(
        `Failed to validate user room: ${err.message}`,
        { userId: uuid, email },
        err.stack,
      );
      throw new InternalServerErrorException(
        'Failed to validate user room status',
        { cause: err },
      );
    }
  }

  async createCallAndRoom(uuid: string, email: string): Promise<CallResponse> {
    try {
      const call = await this.callService.createCallToken(uuid);
      await this.createRoomForCall(call, uuid, email);
      this.logger.log(`Successfully created call for user: ${email}`);
      return call;
    } catch (error) {
      const err = error as Error;
      this.logger.error(
        `Failed to create call and room: ${err.message}`,
        { userId: uuid, email },
        err.stack,
      );
      throw err;
    }
  }

  async createRoomForCall(
    call: CallResponse,
    uuid: string,
    email: string,
  ): Promise<void> {
    try {
      await this.roomUseCase.createRoom({
        id: call.room,
        host_id: uuid,
        max_users_allowed: call.paxPerCall,
      });
    } catch (error) {
      const err = error as Error;
      this.logger.error(
        `Failed to create room: ${err.message}`,
        { roomId: call.room, userId: uuid, email },
        err.stack,
      );
      throw new ConflictException(
        'Failed to create room. Room might already exist.',
      );
    }
  }

  public handleError(
    error: unknown,
    context: { uuid: string; email: string },
  ): void {
    const err = error as Error;
    this.logger.error(
      `Failed to create call: ${err.message}`,
      {
        userId: context.uuid,
        email: context.email,
        error: err.name,
      },
      err.stack,
    );

    if (
      error instanceof BadRequestException ||
      error instanceof ConflictException ||
      error instanceof InternalServerErrorException
    ) {
      return;
    }

    throw new InternalServerErrorException(
      'An unexpected error occurred while creating the call',
      { cause: err },
    );
  }
}
