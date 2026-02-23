import { render, screen } from '@testing-library/react';
import { AIProfileForm } from '../AIProfileForm';

describe('AIProfileForm Component', () => {
  it('should render forms to input API key and select Model', () => {
    render(<AIProfileForm onSubmit={() => { }} />);
    expect(screen.getByPlaceholderText(/Enter your API Key/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Save Profile/i })).toBeInTheDocument();
  });
});
