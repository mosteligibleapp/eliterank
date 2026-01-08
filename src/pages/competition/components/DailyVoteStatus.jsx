import { Gift, Check } from 'lucide-react';

/**
 * Daily free vote status indicator
 *
 * @param {boolean} hasVote - Whether user has free vote available
 * @param {function} onUseVote - Callback when clicking to use vote
 */
export function DailyVoteStatus({ hasVote = true, onUseVote }) {
  return (
    <div className={`daily-vote-status ${hasVote ? 'available' : 'used'}`}>
      <div className="daily-vote-label">Your Daily Vote</div>
      <div className="daily-vote-icon">
        {hasVote ? <Gift size={24} /> : <Check size={24} />}
      </div>
      <div className="daily-vote-text">
        {hasVote ? '1 Free Vote Available' : 'Used Today'}
      </div>
      {hasVote && onUseVote && (
        <button className="daily-vote-btn" onClick={onUseVote}>
          Use Now
        </button>
      )}
    </div>
  );
}

export default DailyVoteStatus;
