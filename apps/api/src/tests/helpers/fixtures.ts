export const mockUser = {
  id: 'user123',
  _id: 'user123',
  username: 'testuser',
  email: 'test@example.com',
  password: '$2a$12$hashedpassword',
  avatar: 'https://example.com/avatar.jpg',
  providers: [],
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
  save: jest.fn().mockResolvedValue(this),
  toJSON: jest.fn().mockReturnThis(),
};

export const mockUserWithoutAvatar = {
  ...mockUser,
  avatar: undefined,
};

export const mockConversation = {
  id: 'conv123',
  _id: 'conv123',
  name: 'Test Conversation',
  ownerId: 'user123',
  type: 'direct',
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
  save: jest.fn().mockResolvedValue(this),
  toJSON: jest.fn().mockReturnThis(),
};

export const mockMessage = {
  id: 'msg123',
  _id: 'msg123',
  conversationId: 'conv123',
  senderId: 'user123',
  text: 'Hello World',
  url: undefined,
  fileName: undefined,
  createdAt: new Date('2024-01-01T12:00:00.000Z'),
  updatedAt: new Date('2024-01-01T12:00:00.000Z'),
};

export const mockMessageDto = {
  id: 'msg123',
  conversationId: 'conv123',
  senderId: 'user123',
  senderName: 'testuser',
  senderAvatar: 'https://example.com/avatar.jpg',
  text: 'Hello World',
  url: undefined,
  fileName: undefined,
  createdAt: '2024-01-01T12:00:00.000Z',
  updatedAt: '2024-01-01T12:00:00.000Z',
};

export const mockSession = {
  id: 'session123',
  _id: 'session123',
  userId: 'user123',
  refreshToken: 'valid-refresh-token',
  fingerprint: 'abc123',
  expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
  isExpired: jest.fn().mockReturnValue(false),
  save: jest.fn().mockResolvedValue(this),
};

export const mockFriendRequest = {
  id: 'fr123',
  _id: 'fr123',
  fromUserId: 'user123',
  toUserId: 'user456',
  status: 'pending',
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
  save: jest.fn().mockResolvedValue(this),
};

export const mockFriendship = {
  id: 'friend123',
  _id: 'friend123',
  userId: 'user123',
  friendId: 'user456',
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
};

export const mockParticipant = {
  id: 'part123',
  _id: 'part123',
  userId: 'user123',
  conversationId: 'conv123',
  unreadCount: 0,
  lastReadAt: new Date('2024-01-01'),
  joinedAt: new Date('2024-01-01'),
};
