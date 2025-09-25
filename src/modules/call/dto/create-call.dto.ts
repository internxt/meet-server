import { ApiProperty } from '@nestjs/swagger';

export class CreateCallResponseDto {
  @ApiProperty({
    description: 'The room uuid',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  room: string;

  @ApiProperty({
    description: 'The pax per call for the user',
    example: 10,
  })
  paxPerCall: number;

  @ApiProperty({
    description: 'The application ID used for Jitsi connection authentication',
    type: String,
    example: 'vpaaS-magic-cookie-b6c3adeead3f12f2bdb7e123123123e8',
  })
  appId: string;
}
