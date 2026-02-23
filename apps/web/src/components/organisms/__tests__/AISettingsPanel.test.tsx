import { render, screen } from '@testing-library/react';
import { vi, describe, it, expect, beforeAll, afterAll } from 'vitest';
import { AISettingsPanel } from '../AISettingsPanel';

describe('AISettingsPanel Component', () => {
  let originalFetch: typeof global.fetch;

  beforeAll(() => {
    originalFetch = global.fetch;
  });

  afterAll(() => {
    global.fetch = originalFetch;
  });

  it('renders provider selection and API key input', async () => {
    global.fetch = vi.fn(() =>
      Promise.resolve({
        json: () => Promise.resolve({ success: true, data: { provider: 'openrouter' } }),
        ok: true,
        status: 200,
      })
    ) as unknown as typeof fetch;

    render(<AISettingsPanel />);

    expect(await screen.findByLabelText(/AI Provider/i)).toBeInTheDocument();
    expect(await screen.findByLabelText(/API Key/i)).toBeInTheDocument();
  });
});
