import { OptionalJwtAuthGuard } from './optional-auth.guard';
import { mockUserPayload } from '../call/fixtures';
import { UserTokenData } from './dto/user.dto';

describe('OptionalJwtAuthGuard', () => {
  let optionalJwtAuthGuard: OptionalJwtAuthGuard;

  beforeEach(() => {
    optionalJwtAuthGuard = new OptionalJwtAuthGuard();
  });

  it('should return the user if present', () => {
    const user = mockUserPayload;

    const result = optionalJwtAuthGuard.handleRequest<UserTokenData['payload']>(
      null,
      user as UserTokenData['payload'],
    );

    expect(result).toEqual(user);
  });

  it('should return null if no user (no JWT)', () => {
    const result = optionalJwtAuthGuard.handleRequest(null, false);

    expect(result).toBeNull();
  });

  it('should return null if authentication fails', () => {
    const error = new Error('Invalid token');

    const result = optionalJwtAuthGuard.handleRequest(error, false);

    expect(result).toBeNull();
  });
});
