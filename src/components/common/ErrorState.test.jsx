import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ErrorState from './ErrorState';

describe('ErrorState', () => {
  it('renders default title and message', () => {
    render(<ErrorState />);
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    expect(screen.getByText('An unexpected error occurred. Please try again.')).toBeInTheDocument();
  });

  it('renders custom title and message', () => {
    render(
      <ErrorState
        title="Network Error"
        message="Check your connection."
      />
    );
    expect(screen.getByText('Network Error')).toBeInTheDocument();
    expect(screen.getByText('Check your connection.')).toBeInTheDocument();
  });

  it('renders Try Again button with onRetry', () => {
    const handleRetry = vi.fn();
    render(<ErrorState onRetry={handleRetry} />);
    const button = screen.getByText('Try Again');
    expect(button).toBeInTheDocument();
    fireEvent.click(button);
    expect(handleRetry).toHaveBeenCalledOnce();
  });

  it('does not render button without onRetry', () => {
    render(<ErrorState />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('renders warning icon', () => {
    const { container } = render(<ErrorState />);
    // lucide-react renders an SVG
    const svg = container.querySelector('svg');
    expect(svg).toBeInTheDocument();
  });
});
