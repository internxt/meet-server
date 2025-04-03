import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { UserTokenData } from '../dto/user.dto';
import { Request } from 'express';

interface RequestWithUser extends Request {
  user: UserTokenData['payload'];
}

export const userFactory = (
  data: keyof UserTokenData['payload'] | undefined,
  ctx: ExecutionContext,
) => {
  const request = ctx.switchToHttp().getRequest<RequestWithUser>();
  const user = request.user;

  if (!user) {
    return null;
  }

  if (data) {
    return user?.[data];
  }

  return user;
};

export const User = createParamDecorator(userFactory);
