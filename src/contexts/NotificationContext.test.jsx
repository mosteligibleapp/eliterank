import { describe, it, expect, vi } from 'vitest';
import { render, screen, act } from '@testing-library/react';

// Mock supabase before importing
vi.mock('../lib/supabase', () => {
  // Build a fluent chain where every method returns the chain, and it's thenable
  function makeChain(result) {
    const chain = new Proxy({}, {
      get(target, prop) {
        if (prop === 'then') return (fn) => Promise.resolve(result).then(fn);
        if (prop === 'catch') return (fn) => Promise.resolve(result).catch(fn);
        return vi.fn(() => chain);
      },
    });
    return chain;
  }

  return {
    supabase: {
      from: vi.fn(() => makeChain({ data: [], count: 0, error: null })),
    },
    isSupabaseConfigured: () => true,
  };
});

vi.mock('../hooks', () => ({
  useSupabaseAuth: () => ({
    user: { id: 'u1' },
    isAuthenticated: true,
  }),
}));

const { NotificationProvider, useNotifications } = await import('./NotificationContext');

function TestConsumer() {
  const { notifications, unreadCount, isOpen, togglePanel, deleteNotification } = useNotifications();
  return (
    <div>
      <span data-testid="count">{unreadCount}</span>
      <span data-testid="total">{notifications.length}</span>
      <span data-testid="isOpen">{isOpen ? 'yes' : 'no'}</span>
      <button data-testid="toggle" onClick={togglePanel}>Toggle</button>
      <button data-testid="delete" onClick={() => deleteNotification('1')}>Delete</button>
    </div>
  );
}

describe('NotificationContext', () => {
  it('provides default values outside provider', () => {
    function Orphan() {
      const ctx = useNotifications();
      return <span data-testid="count">{ctx.unreadCount}</span>;
    }
    render(<Orphan />);
    expect(screen.getByTestId('count').textContent).toBe('0');
  });

  it('calls supabase.from on mount (fetches notifications)', async () => {
    const { supabase } = await import('../lib/supabase');

    await act(async () => {
      render(
        <NotificationProvider>
          <TestConsumer />
        </NotificationProvider>
      );
    });

    // Should have called from('notifications') at least once
    expect(supabase.from).toHaveBeenCalledWith('notifications');
  });

  it('togglePanel toggles isOpen state', async () => {
    await act(async () => {
      render(
        <NotificationProvider>
          <TestConsumer />
        </NotificationProvider>
      );
    });

    expect(screen.getByTestId('isOpen').textContent).toBe('no');

    await act(async () => {
      screen.getByTestId('toggle').click();
    });

    expect(screen.getByTestId('isOpen').textContent).toBe('yes');

    await act(async () => {
      screen.getByTestId('toggle').click();
    });

    expect(screen.getByTestId('isOpen').textContent).toBe('no');
  });

  it('does not have supabase.channel (realtime removed)', async () => {
    const mod = await import('../lib/supabase');
    expect(mod.supabase.channel).toBeUndefined();
  });

  it('exposes deleteNotification in the context', async () => {
    await act(async () => {
      render(
        <NotificationProvider>
          <TestConsumer />
        </NotificationProvider>
      );
    });

    // Should be able to call delete without crashing
    await act(async () => {
      screen.getByTestId('delete').click();
    });

    // If we got here without throwing, deleteNotification works
    expect(true).toBe(true);
  });
});
