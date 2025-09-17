import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString, IsUUID } from 'class-validator';

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
    deprecated: true,
  })
  @IsBoolean()
  @IsOptional()
  anonymous?: boolean;

  @ApiPropertyOptional({
    description: 'Id to use for anonymous user',
    type: String,
    required: false,
  })
  @IsUUID()
  @IsOptional()
  anonymousId?: string;

  @IsString()
  @IsOptional()
  email?: string;
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

  @ApiProperty({
    description: 'The application ID used for Jitsi connection authentication',
    type: String,
    example: 'vpaaS-magic-cookie-b6c3adeead3f12f2bdb7e123123123e8',
  })
  appId: string;
}
