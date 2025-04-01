import {
  BadRequestException,
  ConflictException,
  Controller,
  HttpCode,
  InternalServerErrorException,
  Logger,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiInternalServerErrorResponse,
  ApiConflictResponse,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/auth.guard';
import { CallUseCase, CallResponse } from './call.usecase';
import { UserTokenData } from '../auth/dto/user.dto';
interface RequestWithUser {
  user?: UserTokenData['payload'];
}

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
  async createCall(@Request() req: RequestWithUser): Promise<CallResponse> {
    console.log(req.user);
    const { uuid, email } = req.user || {};
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
}
