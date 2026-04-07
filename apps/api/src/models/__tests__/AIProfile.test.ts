
import { AIProfile } from '../AIProfile';

describe('AIProfile Model', () => {
  it('should throw validation error if required fields are missing', async () => {
    const profile = new AIProfile({ systemPrompt: 'You are a dev.' });
    await expect(profile.validate()).rejects.toThrow();
  });
});
