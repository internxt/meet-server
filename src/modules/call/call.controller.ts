import {
  BadRequestException,
  Body,
  ConflictException,
  Controller,
  Get,
  HttpCode,
  InternalServerErrorException,
  Logger,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiBody,
  ApiConflictResponse,
  ApiInternalServerErrorResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/auth.guard';
import { OptionalAuth } from '../auth/decorators/optional-auth.decorator';
import { User } from '../auth/decorators/user.decorator';
import { UserTokenData } from '../auth/dto/user.dto';
import { UsersInRoomDto } from '../room/dto/users-in-room.dto';
import { RoomUserUseCase } from '../room/room-user.usecase';
import { CallUseCase } from './call.usecase';
import { CreateCallResponseDto } from './dto/create-call.dto';
import { JoinCallDto, JoinCallResponseDto } from './dto/join-call.dto';
import { LeaveCallDto } from './dto/leave-call.dto';

@ApiTags('Call')
@Controller('call')
export class CallController {
  private readonly logger = new Logger(CallController.name);

  constructor(
    private readonly callUseCase: CallUseCase,
    private readonly roomUserUseCase: RoomUserUseCase,
  ) {}

  @Post('/')
  @HttpCode(200)
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'Creates a Meet (Jitsi) token',
  })
  @ApiBearerAuth()
  @ApiOkResponse({
    description: 'Creates a Jitsi token and returns it to create the call',
    type: CreateCallResponseDto,
  })
  @ApiBadRequestResponse({ description: "The user can't create a call" })
  @ApiInternalServerErrorResponse({ description: 'Internal server error' })
  @ApiConflictResponse({ description: 'Room already exists' })
  async createCall(
    @User() user: UserTokenData['payload'],
  ): Promise<CreateCallResponseDto> {
    const { uuid, email } = user || {};
    if (!uuid) {
      this.logger.warn(
        `Attempt to create call without UUID for user: ${email}`,
      );
      throw new BadRequestException('The user id is needed to create a call');
    }

    try {
      await this.callUseCase.validateUserHasNoActiveRoom(uuid, email);
      const call = await this.callUseCase.createCallAndRoom(user);
      return call;
    } catch (error) {
      const err = error as Error;
      this.logger.error(
        `Failed to create call: ${err.message}`,
        {
          userId: uuid,
          email: email,
          error: err.name,
        },
        err.stack,
      );

      if (
        error instanceof BadRequestException ||
        error instanceof ConflictException ||
        error instanceof InternalServerErrorException
      ) {
        throw error;
      }

      throw new InternalServerErrorException(
        'An unexpected error occurred while creating the call',
        { cause: err.stack ?? err.message },
      );
    }
  }

  @Post('/:id/users/join')
  @HttpCode(200)
  @OptionalAuth()
  @ApiOperation({
    summary: 'Join an existing call',
  })
  @ApiBearerAuth()
  @ApiParam({ name: 'id', description: 'Call/Room ID' })
  @ApiBody({ type: JoinCallDto })
  @ApiOkResponse({
    description: 'Successfully joined the call',
    type: JoinCallResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Failed to join call, room is full or invalid request',
  })
  @ApiNotFoundResponse({ description: 'Call/Room not found' })
  @ApiConflictResponse({ description: 'User is already in this room' })
  @ApiInternalServerErrorResponse({ description: 'Internal server error' })
  async joinCall(
    @Param('id') roomId: string,
    @User() user: UserTokenData['payload'],
    @Body() joinCallDto?: JoinCallDto,
  ): Promise<JoinCallResponseDto> {
    const { uuid, email } = user || {};

    return await this.callUseCase.joinCall(roomId, {
      userId: uuid,
      name: joinCallDto?.name,
      lastName: joinCallDto?.lastName,
      anonymous: joinCallDto?.anonymous || !user,
      email: email,
    });
  }

  @Get('/:id/users')
  @HttpCode(200)
  @OptionalAuth()
  @ApiOperation({
    summary: 'Get users in a call',
  })
  @ApiBearerAuth()
  @ApiParam({ name: 'id', description: 'Call/Room ID' })
  @ApiOkResponse({
    description: 'Successfully got users in a call',
    type: UsersInRoomDto,
    isArray: true,
  })
  @ApiNotFoundResponse({ description: 'Call/Room not found' })
  @ApiInternalServerErrorResponse({ description: 'Internal server error' })
  getUsersInCall(@Param('id') roomId: string): Promise<UsersInRoomDto[]> {
    return this.roomUserUseCase.getUsersInRoom(roomId);
  }

  @Post('/:id/users/leave')
  @HttpCode(200)
  @OptionalAuth()
  @ApiOperation({
    summary: 'Leave a call',
    description: `Allows a user to leave a call. If the user is not in the call, the operation is idempotent and still returns 200 OK. The response body is empty.`,
  })
  @ApiBearerAuth()
  @ApiParam({ name: 'id', description: 'Call/Room ID' })
  @ApiBody({ type: LeaveCallDto, required: false })
  @ApiOkResponse({
    description:
      'Successfully left the call or user was not in the call (idempotent). Response body is empty.',
    type: undefined,
    schema: { example: undefined },
  })
  @ApiNotFoundResponse({ description: 'Call/Room not found' })
  @ApiInternalServerErrorResponse({ description: 'Internal server error' })
  leaveCall(
    @Param('id') roomId: string,
    @User() user: UserTokenData['payload'],
    @Body() leaveCallDto?: LeaveCallDto,
  ): Promise<void> {
    const { uuid } = user || {};
    return this.callUseCase.leaveCall(roomId, uuid || leaveCallDto?.userId);
  }
}
