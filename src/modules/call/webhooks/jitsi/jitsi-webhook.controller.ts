import {
  BadRequestException,
  Body,
  Controller,
  Headers,
  Logger,
  Post,
  UnauthorizedException,
} from '@nestjs/common';
import { ApiBody, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import {
  JitsiGenericWebHookEvent,
  JitsiWebhookPayload,
} from './interfaces/JitsiGenericWebHookPayload';
import { JitsiParticipantLeftWebHookPayload } from './interfaces/JitsiParticipantLeftData';
import { JitsiWebhookService } from './jitsi-webhook.service';

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
    @Body() payload: JitsiWebhookPayload,
    @Headers() headers: Record<string, string>,
  ): Promise<{ success: boolean }> {
    this.logger.log(`Received webhook event: ${payload.eventType}`);

    if (!this.jitsiWebhookService.validateWebhookRequest(headers, payload)) {
      this.logger.warn('Invalid webhook request');
      throw new UnauthorizedException('Invalid webhook request');
    }

    if (!payload?.eventType) {
      this.logger.warn('Invalid payload: missing eventType');
      throw new BadRequestException('Invalid payload: missing eventType');
    }

    try {
      switch (payload.eventType) {
        case JitsiGenericWebHookEvent.PARTICIPANT_LEFT:
          await this.jitsiWebhookService.handleParticipantLeft(
            payload as JitsiParticipantLeftWebHookPayload,
          );
          break;

        default:
          this.logger.warn(
            {
              eventType: payload.eventType,
            },
            'Ignoring unhandled event type',
          );
          break;
      }

      return { success: true };
    } catch (error: unknown) {
      if (error instanceof Error) {
        this.logger.error({ error }, 'Error processing webhook event');
      }
      throw new BadRequestException(`Error processing webhook event`);
    }
  }
}
