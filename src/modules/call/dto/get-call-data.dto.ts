import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class GetCallDataDto {
  @ApiProperty({
    description: 'The room uuid',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  id: string;

  @ApiProperty({
    description: 'Maximum number of users allowed in the call',
    example: 10,
  })
  maxUsersAllowed: number;

  @ApiPropertyOptional({
    description: 'Whether the call is closed',
    example: false,
  })
  isClosed?: boolean;

  @ApiPropertyOptional({
    description: 'Date when the room will be automatically removed',
    example: '2025-11-03T12:00:00.000Z',
  })
  removeAt?: Date;

  @ApiProperty({
    description: 'Date when the room was created',
    example: '2025-11-03T10:00:00.000Z',
  })
  createdAt?: Date;

  @ApiProperty({
    description: 'Date when the room was last updated',
    example: '2025-11-03T11:00:00.000Z',
  })
  updatedAt?: Date;
}
