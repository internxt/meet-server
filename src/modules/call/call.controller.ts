import {
  BadRequestException,
  Body,
  Controller,
  HttpCode,
  Post,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { CallService } from './call.service';
import { HostUserDto } from './hostUser.dto';

@ApiTags('Call')
@Controller('call')
export class CallController {
  constructor(private readonly callService: CallService) {}

  @Post('/')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Creates a Meet (Jitsi) token',
  })
  @ApiOkResponse({
    description: 'Creates a Jitsi token and returns it to create the call',
  })
  @ApiBadRequestResponse({ description: "The user can't create a call" })
  async createCall(@Body() hostUserDto: HostUserDto) {
    const { uuid } = hostUserDto;
    if (!uuid)
      throw new BadRequestException('The user uuid is needed to create a call');

    const userExists = await this.callService.createCall(uuid);

    return userExists;
  }
}
