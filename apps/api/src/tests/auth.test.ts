import { User } from '../models/User';

describe('User model — providers field', () => {
  it('should save a user with a providers array', async () => {
    const user = new User({
      username: 'testuser_providers',
      email: 'providers@test.com',
      providers: [{
        name: 'google',
        providerId: 'google-sub-123',
        email: 'providers@test.com',
        avatar: 'https://example.com/avatar.png',
        linkedAt: new Date(),
      }],
    });

    // Validate does NOT throw
    const err = user.validateSync();
    expect(err).toBeUndefined();
    expect(user.providers).toHaveLength(1);
    const firstProvider = user.providers[0];
    expect(firstProvider).toBeDefined();
    expect(firstProvider?.name).toBe('google');
  });

  it('should allow a user with no providers (email+password user)', () => {
    const user = new User({
      username: 'testuser_noproviders',
      email: 'noproviders@test.com',
      password: 'hashedpassword',
    });

    const err = user.validateSync();
    expect(err).toBeUndefined();
  });
});

import { AuthService } from '../services/auth.service';

describe('AuthService.findOrCreateOAuthUser()', () => {
  const authService = new AuthService();

  const mockGoogleProfile = {
    provider: 'google' as const,
    providerId: 'google-sub-456',
    email: 'newuser@example.com',
    name: 'New User',
    avatar: 'https://example.com/photo.jpg',
  };

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should create a new user when email does not exist', async () => {
    jest.spyOn(User, 'findOne')
      .mockResolvedValueOnce(null) // no existing user by email
      .mockResolvedValueOnce(null); // username not taken
    const saveMock = jest.fn().mockResolvedValue({
      id: 'new-user-id',
      username: 'New User',
      email: 'newuser@example.com',
      providers: [{ name: 'google', providerId: 'google-sub-456', email: 'newuser@example.com' }],
      createdAt: new Date(),
    });
    jest.spyOn(User.prototype, 'save').mockImplementation(saveMock);

    const result = await authService.findOrCreateOAuthUser(mockGoogleProfile);
    expect(saveMock).toHaveBeenCalled();
    expect(result.email).toBe('newuser@example.com');
  });

  it('should auto-link existing user when email matches', async () => {
    const existingUser: {
      id: string;
      username: string;
      email: string;
      providers: { name: string; providerId: string; email: string; avatar?: string; linkedAt?: Date }[];
      avatar: undefined;
      save: jest.Mock;
    } = {
      id: 'existing-user-id',
      username: 'ExistingUser',
      email: 'newuser@example.com',
      providers: [],
      avatar: undefined,
      save: jest.fn().mockResolvedValue(undefined),
    };
    jest.spyOn(User, 'findOne').mockResolvedValueOnce(existingUser as any);

    const result = await authService.findOrCreateOAuthUser(mockGoogleProfile);
    expect(existingUser.save).toHaveBeenCalled();
    // Provider was upserted
    expect(existingUser.providers).toHaveLength(1);
    const linkedProvider = existingUser.providers[0];
    expect(linkedProvider).toBeDefined();
    expect(linkedProvider?.providerId).toBe('google-sub-456');
    expect(result.email).toBe('newuser@example.com');
  });

  it('should upsert (not duplicate) provider on re-login', async () => {
    const existingUser = {
      id: 'existing-user-id',
      username: 'ExistingUser',
      email: 'newuser@example.com',
      providers: [{ name: 'google', providerId: 'google-sub-456', email: 'newuser@example.com', avatar: 'old', linkedAt: new Date() }],
      avatar: undefined,
      save: jest.fn().mockResolvedValue(undefined),
    };
    jest.spyOn(User, 'findOne').mockResolvedValueOnce(existingUser as any);

    await authService.findOrCreateOAuthUser({ ...mockGoogleProfile, avatar: 'https://new-avatar.jpg' });
    // Still only 1 provider entry
    expect(existingUser.providers).toHaveLength(1);
  });
});
