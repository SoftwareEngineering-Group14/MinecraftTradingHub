import { render, screen } from '@testing-library/react';
import HomePage from '@/app/page';

describe('HomePage', () => {
  it('renders welcome heading', () => {
    render(<HomePage />);
    expect(screen.getByText(/Welcome to the Minecraft Trading Hub/i)).toBeInTheDocument();
  });

  it('renders description paragraph', () => {
    render(<HomePage />);
    expect(screen.getByText(/Your one-stop destination for all Minecraft trading needs!/i)).toBeInTheDocument();
  });
});
