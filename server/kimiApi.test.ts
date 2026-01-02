import { describe, it, expect } from 'vitest';
import { validateKimiApiKey } from './_core/aiService';

describe('Kimi API Key Validation', () => {
  it('should validate Kimi API key', async () => {
    const isValid = await validateKimiApiKey();
    expect(typeof isValid).toBe('boolean');
    // If KIMI_API_KEY is set, it should be valid
    if (process.env.KIMI_API_KEY) {
      expect(isValid).toBe(true);
    }
  }, 15000); // 15 second timeout for API call
});
