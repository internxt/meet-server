import { applyDecorators, UseGuards } from '@nestjs/common';
import { OptionalJwtAuthGuard } from '../optional-auth.guard';
import { ApiBearerAuth, ApiUnauthorizedResponse } from '@nestjs/swagger';

export function OptionalAuth() {
  return applyDecorators(
    UseGuards(OptionalJwtAuthGuard),
    ApiBearerAuth(),
    ApiUnauthorizedResponse({ description: 'Invalid JWT token (if provided)' }),
  );
}
