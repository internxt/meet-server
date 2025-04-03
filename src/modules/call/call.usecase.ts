import {
  Injectable,
  Logger,
  BadRequestException,
  ConflictException,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { CallService } from './call.service';
import { RoomUseCase } from '../room/room.usecase';
import { Room } from '../room/room.domain';
import { RoomUserUseCase } from '../room/room-user.usecase';
import { JoinCallResponse } from './dto/join-call.dto';
import { v4 as uuidv4 } from 'uuid';

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
    private readonly roomUserUseCase: RoomUserUseCase,
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
      await this.roomUseCase.createRoom(
        new Room({
          id: call.room,
          hostId: uuid,
          maxUsersAllowed: call.paxPerCall,
        }),
      );
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

  async joinCall(
    roomId: string,
    userData: {
      userId?: string;
      name?: string;
      lastName?: string;
      anonymous?: boolean;
    },
  ): Promise<JoinCallResponse> {
    try {
      const room = await this.roomUseCase.getRoomByRoomId(roomId);
      if (!room) {
        throw new NotFoundException(`Specified room not found`);
      }

      const processedUserData = this.processUserData(userData);

      const roomUser = await this.roomUserUseCase.addUserToRoom(
        roomId,
        processedUserData,
      );

      // Generate token for the user
      const token = this.callService.createCallTokenForParticipant(
        roomUser.userId,
        roomId,
        !!roomUser.anonymous,
      );

      return {
        token,
        room: roomId,
        userId: roomUser.userId,
      };
    } catch (error) {
      if (
        error instanceof BadRequestException ||
        error instanceof ConflictException ||
        error instanceof NotFoundException ||
        error instanceof InternalServerErrorException
      ) {
        throw error;
      }

      const err = error as Error;
      this.logger.error(
        `Failed to join call: ${err.message}`,
        {
          roomId,
          userData,
          error: err.name,
        },
        err.stack,
      );

      throw new InternalServerErrorException(
        'An unexpected error occurred while joining the call',
        { cause: err },
      );
    }
  }

  private processUserData(userData: {
    userId?: string;
    name?: string;
    lastName?: string;
    anonymous?: boolean;
  }): {
    userId: string;
    name?: string;
    lastName?: string;
    anonymous: boolean;
  } {
    const { userId, name, lastName, anonymous = false } = userData;

    if (anonymous || !userId) {
      return {
        userId: uuidv4(),
        name,
        lastName,
        anonymous: true,
      };
    }

    return {
      userId,
      name,
      lastName,
      anonymous: false,
    };
  }
}
