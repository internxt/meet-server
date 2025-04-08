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

export interface JoinCallResponse {
  token: string;
  room: string;
  userId: string;
}
