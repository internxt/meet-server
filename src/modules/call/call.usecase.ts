import {
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { UserTokenData } from '../auth/dto/user.dto';
import { RoomService } from './services/room.service';
import { Room } from './domain/room.domain';
import { User } from '../../shared/user/user.domain';
import { CallService } from './services/call.service';
import { CreateCallResponseDto } from './dto/create-call.dto';
import { JoinCallResponseDto } from './dto/join-call.dto';

@Injectable()
export class CallUseCase {
  private readonly logger = new Logger(CallUseCase.name);

  constructor(
    private readonly callService: CallService,
    private readonly roomService: RoomService,
  ) {}

  async createCallAndRoom(
    user: User | UserTokenData['payload'],
  ): Promise<CreateCallResponseDto> {
    await this.validateUserHasNoActiveRoom(user.uuid, user.email);

    const call = await this.callService.createCallToken(user);

    const newRoom = new Room({
      id: call.room,
      hostId: user.uuid,
      maxUsersAllowed: call.paxPerCall,
    });

    await this.roomService.createRoom(newRoom);

    return call;
  }

  async validateUserHasNoActiveRoom(
    uuid: string,
    email: string,
  ): Promise<void> {
    const activeRoom = await this.roomService.getOpenRoomByHostId(uuid);

    if (activeRoom) {
      this.logger.warn(
        `User ${email} already has an active room as host: ${activeRoom.id}`,
      );
      throw new ConflictException('User already has an active room as host');
    }
  }

  async joinCall(
    roomId: string,
    userData: {
      userId?: string;
      name?: string;
      lastName?: string;
      anonymous?: boolean;
      email?: string;
    },
  ): Promise<JoinCallResponseDto> {
    const room = await this.roomService.getRoomByRoomId(roomId);
    if (!room) {
      throw new NotFoundException(`Specified room not found`);
    }

    const processedUserData = this.processUserData(userData);
    const isOwner = processedUserData.userId === room.hostId;

    if (!isOwner && room.isClosed) {
      throw new ForbiddenException('Room is closed');
    }

    const roomUser = await this.roomService.addUserToRoom(
      roomId,
      processedUserData,
    );

    // Generate token for the user
    const tokenData = this.callService.createCallTokenForParticipant(
      roomUser.userId,
      roomId,
      !!roomUser.anonymous,
      isOwner,
      processedUserData,
    );

    if (processedUserData.userId === room.hostId && room.isClosed) {
      await this.roomService.openRoom(roomId);
    }

    return {
      token: tokenData.token,
      room: roomId,
      userId: roomUser.userId,
      appId: tokenData.appId,
    };
  }

  private processUserData(userData: {
    userId?: string;
    name?: string;
    lastName?: string;
    anonymous?: boolean;
    email?: string;
  }): {
    userId: string;
    name?: string;
    lastName?: string;
    anonymous: boolean;
    email?: string;
  } {
    const { userId, name, lastName, anonymous = false, email } = userData;

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
      email,
    };
  }

  async leaveCall(roomId: string, userId: string): Promise<void> {
    const room = await this.roomService.getRoomByRoomId(roomId);

    if (!room) {
      throw new NotFoundException(`Specified room not found`);
    }

    const isHostLeaving = room.hostId === userId;

    await this.roomService.removeUserFromRoom(userId, room);

    const remainingUsers = await this.roomService.countUsersInRoom(roomId);

    if (remainingUsers === 0) {
      await this.roomService.removeRoom(roomId);
    } else if (isHostLeaving) {
      await this.roomService.closeRoom(roomId);
    }
  }
}
