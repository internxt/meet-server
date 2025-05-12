import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional } from 'class-validator';

export class LeaveCallDto {
  @ApiProperty({
    description: 'User ID for anonymous users',
    required: false,
  })
  @IsString()
  @IsOptional()
  userId?: string;
}
