import { ApiProperty } from '@nestjs/swagger';

export class UsersInRoomDto {
  @ApiProperty({
    description: 'The ID of the user',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  id: string;

  @ApiProperty({
    description: 'The name of the user',
    example: 'John',
  })
  name: string;

  @ApiProperty({
    description: 'The last name of the user',
    example: 'Doe',
  })
  lastName: string;

  @ApiProperty({
    description: 'Whether the user is anonymous',
    example: false,
  })
  anonymous: boolean;

  @ApiProperty({
    description: 'The avatar of the user',
    example: 'https://example.com/avatar.png',
  })
  avatar: string;
}
