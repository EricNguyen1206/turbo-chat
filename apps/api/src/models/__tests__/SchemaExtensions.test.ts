import mongoose from 'mongoose';
import { User } from '../User';
import { Conversation } from '../Conversation';
import { Message } from '../Message';

describe('Schema Extensions for AI Tracking', () => {
  it('should initialize and validate new extended AI fields correctly', () => {
    const user = new User({ username: 'test', llmProviders: { openai: 'sk-123' }, defaultModel: 'gpt-4o' });
    const conv = new Conversation({ aiProfileId: new mongoose.Types.ObjectId(), totalTokensUsed: 100, maxContextWindow: 4000 });
    const msg = new Message({ tokenCount: 15, isArchived: true });

    expect(user.llmProviders?.get('openai')).toBe('sk-123');
    expect(conv.totalTokensUsed).toBe(100);
    expect(msg.isArchived).toBe(true);
  });
});
