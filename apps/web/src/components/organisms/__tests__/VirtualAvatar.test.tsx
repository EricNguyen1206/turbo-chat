import { render } from '@testing-library/react';
import VirtualAvatar from '../VirtualAvatar';
import { vi, describe, it, expect } from 'vitest';

// Mock Three.js and Fiber to avoid WebGL context issues in JSDOM
vi.mock('@react-three/fiber', () => ({
  Canvas: ({ children }: any) => <div data-testid="mock-canvas">{children}</div>,
  useFrame: vi.fn(),
}));

vi.mock('@react-three/drei', () => ({
  OrbitControls: () => <div data-testid="mock-orbit-controls" />,
  Environment: () => <div data-testid="mock-environment" />,
  ContactShadows: () => <div data-testid="mock-contact-shadows" />,
}));

describe('VirtualAvatar', () => {
  it('renders the canvas and essential 3D components', () => {
    const { getByTestId } = render(<VirtualAvatar />);

    expect(getByTestId('mock-canvas')).toBeInTheDocument();
    expect(getByTestId('mock-environment')).toBeInTheDocument();
    expect(getByTestId('mock-orbit-controls')).toBeInTheDocument();
  });

  it('renders correctly when speaking', () => {
    const { getByTestId } = render(<VirtualAvatar isSpeaking={true} />);

    expect(getByTestId('mock-canvas')).toBeInTheDocument();
  });
});
