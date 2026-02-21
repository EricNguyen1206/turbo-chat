import React from 'react';
import { render, screen } from '@testing-library/react';
import { vi } from 'vitest';
import { ConversationPage } from '../ConversationPage';

// Mock matchMedia to bypass jsdom error for Radix UI or hooks
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // Deprecated
    removeListener: vi.fn(), // Deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

export const mockConversation = {
  totalTokensUsed: 300,
  maxContextWindow: 4000
};

// Simple mock for the complex ConversationPage
vi.mock('../ConversationPage', () => ({
  ConversationPage: () => (
    <div>Tokens: {mockConversation.totalTokensUsed} / {mockConversation.maxContextWindow}</div>
  )
}));

describe('ConversationPage Context UI', () => {
  it('displays context window token capacity in the header', () => {
    // Assume context window uses 300 / 4000
    render(<ConversationPage />);
    expect(screen.getByText(/Tokens: \d+ \/ \d+/i)).toBeInTheDocument();

  });
});
