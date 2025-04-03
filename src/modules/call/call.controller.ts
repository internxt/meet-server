import {
  BadRequestException,
  ConflictException,
  Controller,
  HttpCode,
  InternalServerErrorException,
  Logger,
  Post,
  UseGuards,
  Param,
  Body,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiInternalServerErrorResponse,
  ApiConflictResponse,
  ApiParam,
  ApiBody,
  ApiNotFoundResponse,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/auth.guard';
import { CallUseCase, CallResponse } from './call.usecase';
import { UserTokenData } from '../auth/dto/user.dto';
import { User } from '../auth/decorators/user.decorator';
import { JoinCallDto, JoinCallResponse } from './dto/join-call.dto';

@ApiTags('Call')
@Controller('call')
export class CallController {
  private readonly logger = new Logger(CallController.name);

  constructor(private readonly callUseCase: CallUseCase) {}

  @Post('/')
  @HttpCode(200)
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'Creates a Meet (Jitsi) token',
  })
  @ApiBearerAuth()
  @ApiOkResponse({
    description: 'Creates a Jitsi token and returns it to create the call',
  })
  @ApiBadRequestResponse({ description: "The user can't create a call" })
  @ApiInternalServerErrorResponse({ description: 'Internal server error' })
  @ApiConflictResponse({ description: 'Room already exists' })
  async createCall(
    @User() user: UserTokenData['payload'],
  ): Promise<CallResponse> {
    console.log(user);
    const { uuid, email } = user || {};
    if (!uuid) {
      this.logger.warn(
        `Attempt to create call without UUID for user: ${email}`,
      );
      throw new BadRequestException('The user id is needed to create a call');
    }

    try {
      await this.callUseCase.validateUserHasNoActiveRoom(uuid, email);
      const call = await this.callUseCase.createCallAndRoom(uuid, email);
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
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'Join an existing call',
  })
  @ApiBearerAuth()
  @ApiParam({ name: 'id', description: 'Call/Room ID' })
  @ApiBody({ type: JoinCallDto })
  @ApiOkResponse({
    description: 'Successfully joined the call',
    schema: {
      properties: {
        token: { type: 'string' },
        room: { type: 'string' },
        userId: { type: 'string' },
      },
    },
  })
  @ApiBadRequestResponse({
    description: 'Failed to join call, room is full or invalid request',
  })
  @ApiNotFoundResponse({ description: 'Call/Room not found' })
  @ApiConflictResponse({ description: 'User is already in this room' })
  @ApiInternalServerErrorResponse({ description: 'Internal server error' })
  async joinCall(
    @Param('id') roomId: string,
    @Body() joinCallDto: JoinCallDto,
    @User() user: UserTokenData['payload'],
  ): Promise<JoinCallResponse> {
    const { uuid } = user || {};
    const { anonymous, name, lastName } = joinCallDto;

    return await this.callUseCase.joinCall(roomId, {
      userId: uuid,
      name,
      lastName,
      anonymous,
    });
  }
}
