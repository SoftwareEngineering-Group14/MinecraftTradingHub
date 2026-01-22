import { render, screen } from '@testing-library/react';
import TestRoutePage from '@/app/testRoute/page';

describe('TestRoutePage', () => {
  it('renders test route heading', () => {
    render(<TestRoutePage />);
    expect(screen.getByText(/Test Route Page/i)).toBeInTheDocument();
  });

  it('renders test route paragraph', () => {
    render(<TestRoutePage />);
    expect(screen.getByText(/This is a test route for the Minecraft Trading Hub./i)).toBeInTheDocument();
  });
});
