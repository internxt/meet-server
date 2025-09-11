import {
  Controller,
  Post,
  Body,
  Headers,
  Logger,
  BadRequestException,
  UnauthorizedException,
  Req,
} from '@nestjs/common';
import { JitsiWebhookService } from './jitsi-webhook.service';

import { ApiTags, ApiOperation, ApiBody, ApiResponse } from '@nestjs/swagger';
import { RequestWithRawBody } from './interfaces/request.interface';
import { JitsiParticipantLeftWebHookPayload } from './interfaces/JitsiParticipantLeftData';

@ApiTags('Jitsi Webhook')
@Controller('webhook/jitsi')
export class JitsiWebhookController {
  private readonly logger = new Logger(JitsiWebhookController.name);

  constructor(private readonly jitsiWebhookService: JitsiWebhookService) {}

  @Post()
  @ApiOperation({
    summary: 'Handle Jitsi webhook events',
    description:
      'Endpoint for receiving and processing Jitsi webhook events, specifically PARTICIPANT_LEFT events',
  })
  @ApiBody({
    description: 'Webhook event payload from Jitsi',
    type: Object,
  })
  @ApiResponse({
    status: 200,
    description: 'Event processed successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid event payload',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized webhook request',
  })
  async handleWebhook(
    @Body() payload: any,
    @Headers() headers: Record<string, string>,
  ): Promise<{ success: boolean }> {
    this.logger.log(`Received webhook event: ${payload.eventType}`);

    if (!this.jitsiWebhookService.validateWebhookRequest(headers, payload)) {
      this.logger.warn('Invalid webhook request');
      throw new UnauthorizedException('Invalid webhook request');
    }

    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    if (!payload?.eventType) {
      this.logger.warn('Invalid payload: missing eventType');
      throw new BadRequestException('Invalid payload: missing eventType');
    }

    try {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      switch (payload.eventType) {
        case 'PARTICIPANT_LEFT':
          await this.jitsiWebhookService.handleParticipantLeft(
            payload as JitsiParticipantLeftWebHookPayload,
          );
          break;
        default:
          this.logger.log(
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
            `Ignoring unhandled event type: ${payload.eventType}`,
          );
          break;
      }

      return { success: true };
    } catch (error: unknown) {
      if (error instanceof Error) {
        this.logger.error(
          `Error processing webhook event: ${error.message}`,
          error.stack,
        );
      }
      throw new BadRequestException(`Error processing webhook event`);
    }
  }
}
