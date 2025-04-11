import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class JoinCallDto {
  @ApiPropertyOptional({
    description: 'Optional name of the user joining the call',
    type: String,
  })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({
    description: 'Optional last name of the user joining the call',
    type: String,
  })
  @IsString()
  @IsOptional()
  lastName?: string;

  @ApiPropertyOptional({
    description: 'Whether the user is joining anonymously',
    type: Boolean,
    default: false,
  })
  @IsBoolean()
  @IsOptional()
  anonymous?: boolean;
}

export class JoinCallResponseDto {
  @ApiProperty({
    description: 'The token for the user',
    example: 'token',
  })
  token: string;

  @ApiProperty({
    description: 'The room for the user',
    type: String,
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  room: string;

  @ApiProperty({
    description: 'The user id for the user',
    type: String,
    example: '550e8400-e29b-41d4-a716-446655441111',
  })
  userId: string;
}
