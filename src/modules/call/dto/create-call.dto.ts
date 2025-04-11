import { ApiProperty } from '@nestjs/swagger';

export class CreateCallResponseDto {
  @ApiProperty({
    description: 'The token for the user',
    example: 'token',
  })
  token: string;

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
}
