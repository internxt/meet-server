import { UseGuards } from '@nestjs/common';
import { OptionalJwtAuthGuard } from '../optional-auth.guard';
import { OptionalAuth } from './optional-auth.decorator';

type NestCommon = typeof import('@nestjs/common');
type ClassDecorator = (target: any) => any;

jest.mock('@nestjs/common', () => {
  const original = jest.requireActual<NestCommon>('@nestjs/common');
  return {
    ...original,
    UseGuards: jest
      .fn()
      .mockImplementation(
        (guard: typeof OptionalJwtAuthGuard) => `UseGuards(${guard.name})`,
      ),
    applyDecorators: jest
      .fn()
      .mockImplementation((...decorators: ClassDecorator[]) => decorators),
  } as Partial<NestCommon>;
});

jest.mock('@nestjs/swagger', () => ({
  ApiBearerAuth: jest.fn().mockReturnValue('ApiBearerAuth()'),
  ApiUnauthorizedResponse: jest
    .fn()
    .mockImplementation(
      (options) => `ApiUnauthorizedResponse(${JSON.stringify(options)})`,
    ),
}));

describe('OptionalAuth Decorator', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should apply the correct decorators', () => {
    const result = OptionalAuth();

    expect(result.length).toBe(3);

    expect(UseGuards).toHaveBeenCalledWith(OptionalJwtAuthGuard);
    expect(result).toEqual([
      'UseGuards(OptionalJwtAuthGuard)',
      'ApiBearerAuth()',
      'ApiUnauthorizedResponse({"description":"Invalid JWT token (if provided)"})',
    ]);
  });
});
