import { ExecutionContext } from '@nestjs/common';
import { createMock } from '@golevelup/ts-jest';
import { mockUserPayload } from '../../call/fixtures';
import { UserTokenData } from '../dto/user.dto';
import { userFactory } from './user.decorator';

describe('User Decorator', () => {
  let mockExecutionContext: ExecutionContext;
  const mockUser = { ...mockUserPayload };

  beforeEach(() => {
    mockExecutionContext = createMock<ExecutionContext>({
      switchToHttp: () => ({
        getRequest: () => ({
          user: mockUser,
        }),
      }),
    });
  });

  it('should extract entire user object when no data key is provided', () => {
    const result = userFactory(undefined, mockExecutionContext);
    expect(result).toEqual(mockUser);
  });

  it('should extract specific property when specified', () => {
    const emailResult = userFactory('email', mockExecutionContext);
    const uuidResult = userFactory('uuid', mockExecutionContext);
    const usernameResult = userFactory('username', mockExecutionContext);

    expect(emailResult).toEqual(mockUser.email);
    expect(uuidResult).toEqual(mockUser.uuid);
    expect(usernameResult).toEqual(mockUser.username);
  });

  it('should return null when user is not in request (anonymous user)', () => {
    const contextWithoutUser = createMock<ExecutionContext>({
      switchToHttp: () => ({
        getRequest: () => ({
          user: null,
        }),
      }),
    });

    const result = userFactory(undefined, contextWithoutUser);
    expect(result).toBeNull();
  });

  it('should return null when user is null (OptionalJwtAuthGuard scenario)', () => {
    const contextWithNullUser = createMock<ExecutionContext>({
      switchToHttp: () => ({
        getRequest: () => ({
          user: null,
        }),
      }),
    });

    const result = userFactory(undefined, contextWithNullUser);
    expect(result).toBeNull();
  });

  it('should return undefined for non-existent property', () => {
    const result = userFactory(
      'nonExistentProperty' as keyof UserTokenData['payload'],
      mockExecutionContext,
    );
    expect(result).toBeUndefined();
  });
});
