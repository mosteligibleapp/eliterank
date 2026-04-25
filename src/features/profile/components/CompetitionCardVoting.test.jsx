import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';

// ---- Mocks must be declared before importing the component ----

vi.mock('../../../lib/supabase', () => ({ supabase: {}, isSupabaseConfigured: () => false }));

vi.mock('../../../hooks', () => ({
  useSupabaseAuth: () => ({ user: null, isAuthenticated: false }),
  useLeaderboard: () => ({ contestants: [] }),
  useFingerprint: () => ({ fingerprint: 'fp-test', loading: false, error: null }),
}));

vi.mock('../../../contexts/ToastContext', () => ({
  useToast: () => ({ success: vi.fn(), error: vi.fn(), info: vi.fn() }),
}));

const submitAnonymousVoteMock = vi.fn();
vi.mock('../../../lib/votes', () => ({
  hasUsedFreeVoteToday: vi.fn().mockResolvedValue(false),
  submitFreeVote: vi.fn(),
  submitAnonymousVote: (...args) => submitAnonymousVoteMock(...args),
  createVotePaymentIntent: vi.fn(),
}));

vi.mock('../../../lib/stripe', () => ({
  getStripe: vi.fn(),
  isStripeConfigured: () => false,
}));

vi.mock('../../../components/ui', () => ({
  VoteShareCard: () => null,
  Modal: ({ children, isOpen }) => (isOpen ? <div>{children}</div> : null),
}));

vi.mock('../../public-site/components/VoteModal', () => ({
  default: () => null,
}));

const { default: CompetitionCardVoting } = await import('./CompetitionCardVoting');

const baseProps = {
  contestant: { id: 'contestant-1', name: 'Katie Smith' },
  competition: { id: 'comp-1', price_per_vote: 1, use_price_bundler: true },
  currentRound: { id: 'round-1', isActive: true },
};

describe('CompetitionCardVoting (anonymous already-voted lock)', () => {
  beforeEach(() => {
    window.localStorage.clear();
    submitAnonymousVoteMock.mockReset();
  });

  it('shows the active free-vote CTA when nothing is in localStorage', async () => {
    render(<CompetitionCardVoting {...baseProps} />);

    const btn = await screen.findByRole('button', { name: /Use your 1 free daily vote/i });
    expect(btn).toBeEnabled();
  });

  it('shows the disabled "Free daily vote used" state when localStorage has a recent timestamp', async () => {
    window.localStorage.setItem('eliterank-anon-voted-comp-1', String(Date.now()));

    render(<CompetitionCardVoting {...baseProps} />);

    const used = await screen.findByRole('button', { name: /Free daily vote used/i });
    expect(used).toBeDisabled();
    // The original CTA text should not be visible.
    expect(screen.queryByRole('button', { name: /Use your 1 free daily vote/i })).toBeNull();
  });

  it('treats a stale (>24h) localStorage entry as not voted', async () => {
    window.localStorage.setItem(
      'eliterank-anon-voted-comp-1',
      String(Date.now() - 25 * 60 * 60 * 1000),
    );

    render(<CompetitionCardVoting {...baseProps} />);

    const btn = await screen.findByRole('button', { name: /Use your 1 free daily vote/i });
    expect(btn).toBeEnabled();
  });

  it('locks the form when the server returns ALREADY_VOTED, persists it, and disables the CTA', async () => {
    submitAnonymousVoteMock.mockResolvedValue({
      success: false,
      error: "You've already cast your free daily vote from this device. Come back tomorrow!",
      code: 'ALREADY_VOTED',
    });

    render(<CompetitionCardVoting {...baseProps} />);

    // Open the anon form
    const cta = await screen.findByRole('button', { name: /Use your 1 free daily vote/i });
    fireEvent.click(cta);

    // Fill it
    fireEvent.change(screen.getByPlaceholderText('First name'), { target: { value: 'Kelly' } });
    fireEvent.change(screen.getByPlaceholderText('Last name'), { target: { value: 'Clark' } });
    fireEvent.change(screen.getByPlaceholderText('you@email.com'), {
      target: { value: 'kelly@example.com' },
    });

    // Submit — wait long enough that the honeypot's min-submit-time check
    // would also pass server-side (not enforced here, just realistic).
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Submit free vote/i }));
    });

    // After ALREADY_VOTED:
    //  - localStorage timestamp is written
    //  - Form is closed (Submit free vote button gone)
    //  - The free-vote CTA renders disabled with "Free daily vote used"
    //  - Error text is shown
    await waitFor(() => {
      expect(window.localStorage.getItem('eliterank-anon-voted-comp-1')).toBeTruthy();
    });

    expect(screen.queryByRole('button', { name: /Submit free vote/i })).toBeNull();

    const used = await screen.findByRole('button', { name: /Free daily vote used/i });
    expect(used).toBeDisabled();

    expect(screen.getByText(/already cast/i)).toBeInTheDocument();
  });

  it('does NOT lock on a generic (non-ALREADY_VOTED) error', async () => {
    submitAnonymousVoteMock.mockResolvedValue({
      success: false,
      error: 'Submitted too fast — please try again.',
      code: null,
    });

    render(<CompetitionCardVoting {...baseProps} />);

    fireEvent.click(await screen.findByRole('button', { name: /Use your 1 free daily vote/i }));
    fireEvent.change(screen.getByPlaceholderText('First name'), { target: { value: 'Kelly' } });
    fireEvent.change(screen.getByPlaceholderText('Last name'), { target: { value: 'Clark' } });
    fireEvent.change(screen.getByPlaceholderText('you@email.com'), {
      target: { value: 'kelly@example.com' },
    });

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Submit free vote/i }));
    });

    // localStorage remains empty — we only lock on the explicit code.
    expect(window.localStorage.getItem('eliterank-anon-voted-comp-1')).toBeNull();
    // Error is shown but the form stays open so the user can retry.
    expect(screen.getByText(/Submitted too fast/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Submit free vote/i })).toBeInTheDocument();
  });
});
