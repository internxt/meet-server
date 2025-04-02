import { createParamDecorator, ExecutionContext, Logger } from '@nestjs/common';
import { UserTokenData } from '../dto/user.dto';
import { Request } from 'express';

interface RequestWithUser extends Request {
  user: UserTokenData['payload'];
}

const logger = new Logger('UserDecorator');

export const User = createParamDecorator(
  (data: keyof UserTokenData['payload'] | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest<RequestWithUser>();
    logger.debug(
      `Extracting user from request: ${request.user ? 'User found' : 'No user in request'}`,
    );

    const user = request.user;

    if (!user) {
      logger.warn('User not found in request');
      return null;
    }

    if (data) {
      logger.debug(`Extracting specific property from user: ${data}`);
      return user?.[data];
    }

    return user;
  },
);
