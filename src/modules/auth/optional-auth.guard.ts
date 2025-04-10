import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { UserTokenData } from './dto/user.dto';

@Injectable()
export class OptionalJwtAuthGuard extends AuthGuard('jwt') {
  handleRequest<TUser = UserTokenData['payload']>(
    err: any,
    user: TUser | false,
  ): TUser | null {
    return user || null;
  }
}
