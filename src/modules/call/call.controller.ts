/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import {
  BadRequestException,
  Controller,
  HttpCode,
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
} from '@nestjs/swagger';
import { CallService } from './call.service';
import { JwtAuthGuard } from '../auth/auth.guard';
import { UserTokenData } from '../auth/dto/user.dto';

@ApiTags('Call')
@Controller('call')
export class CallController {
  constructor(private readonly callService: CallService) {}

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
  async createCall(@Request() req) {
    const { uuid, email } = req.user as UserTokenData['payload'];

    if (!uuid)
      throw new BadRequestException('The user uuid is needed to create a call');

    try {
      const userExists = await this.callService.createCall(uuid);

      return userExists;
    } catch (error) {
      const err = error as Error;

      new Logger().error(
        `[FILE/METADATA] ERROR: ${err.message}, CONTEXT ${JSON.stringify({
          user: { email, uuid },
        })} STACK: ${err.stack || 'NO STACK'}`,
      );
      throw error;
    }
  }
}
