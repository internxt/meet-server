import { Controller, Get, HttpCode } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { HealthService } from './health.service';

@ApiTags('Health')
@Controller('healthz')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  @HttpCode(200)
  @ApiOperation({ summary: 'Health check endpoint' })
  @ApiOkResponse({ description: 'Service is healthy' })
  async health() {
    return this.healthService.check();
  }
}
