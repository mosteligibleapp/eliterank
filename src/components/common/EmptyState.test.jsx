import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import EmptyState from './EmptyState';

describe('EmptyState', () => {
  it('renders title and description', () => {
    render(
      <EmptyState
        title="No items"
        description="There are no items to display"
      />
    );
    expect(screen.getByText('No items')).toBeInTheDocument();
    expect(screen.getByText('There are no items to display')).toBeInTheDocument();
  });

  it('renders icon when provided', () => {
    render(
      <EmptyState
        icon={<span data-testid="test-icon">icon</span>}
        title="Empty"
      />
    );
    expect(screen.getByTestId('test-icon')).toBeInTheDocument();
  });

  it('renders CTA button and handles click', () => {
    const handleClick = vi.fn();
    render(
      <EmptyState
        title="Empty"
        ctaLabel="Add Item"
        onCta={handleClick}
      />
    );
    const button = screen.getByText('Add Item');
    expect(button).toBeInTheDocument();
    fireEvent.click(button);
    expect(handleClick).toHaveBeenCalledOnce();
  });

  it('does not render CTA button when no label/handler', () => {
    render(<EmptyState title="Empty" />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('does not render CTA button when only label (no handler)', () => {
    render(<EmptyState title="Empty" ctaLabel="Click" />);
    expect(screen.queryByText('Click')).not.toBeInTheDocument();
  });
});
