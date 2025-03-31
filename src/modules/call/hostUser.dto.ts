/* eslint-disable @typescript-eslint/no-unsafe-call */
import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';
import { UUID } from 'crypto';

export class HostUserDto {
  @ApiProperty({
    example: '55555555-5555-5555-5555-555555555555',
    description: 'UUID of the host user',
  })
  @IsNotEmpty()
  @IsUUID()
  uuid: UUID;

  @ApiProperty({
    example: 'John',
    description: 'Name of the host',
  })
  @IsNotEmpty()
  @IsString()
  name: string;

  @ApiProperty({
    example: 'Doe',
    description: 'Last name of the host',
  })
  @IsNotEmpty()
  @IsString()
  lastName: string;

  @ApiProperty({
    example: '<avatar-url>',
    description: 'User Avatar',
  })
  @IsOptional()
  @IsString()
  avatar: string;
}
