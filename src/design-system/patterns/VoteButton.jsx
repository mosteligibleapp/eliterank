import React, { useState } from 'react';
import Button from '../components/Button';

/**
 * VoteButton - Specialized CTA for voting actions
 * 
 * Features:
 * - Gold gradient styling (primary CTA)
 * - Remaining votes indicator
 * - Success animation on vote
 * - Loading state during vote submission
 * - Disabled state when out of votes
 * 
 * @example
 * <VoteButton
 *   onClick={handleVote}
 *   votesRemaining={5}
 *   maxVotes={10}
 * />
 */

const VoteButton = ({
  onClick,
  votesRemaining,
  maxVotes,
  loading = false,
  disabled = false,
  size = 'lg',
  showRemaining = true,
  variant = 'default', // default, compact, icon
  className = '',
}) => {
  const [justVoted, setJustVoted] = useState(false);
  
  const isOutOfVotes = votesRemaining !== undefined && votesRemaining <= 0;
  const isDisabled = disabled || isOutOfVotes || loading;
  
  const handleClick = async (e) => {
    if (isDisabled) return;
    
    // Trigger success animation
    setJustVoted(true);
    
    try {
      await onClick?.(e);
    } finally {
      setTimeout(() => setJustVoted(false), 600);
    }
  };
  
  // Icon-only variant
  if (variant === 'icon') {
    return (
      <button
        onClick={handleClick}
        disabled={isDisabled}
        className={`
          relative
          w-14 h-14
          rounded-full
          bg-gradient-to-r from-gold-600 via-gold to-gold-400
          text-bg-primary
          shadow-lg
          transition-all duration-200
          hover:shadow-glow-gold hover:scale-105
          active:scale-95
          disabled:opacity-50 disabled:pointer-events-none
          ${justVoted ? 'animate-wiggle' : ''}
          ${className}
        `}
      >
        {loading ? (
          <LoadingSpinner className="w-6 h-6" />
        ) : justVoted ? (
          <CheckIcon className="w-6 h-6" />
        ) : (
          <HeartIcon className={`w-6 h-6 ${justVoted ? 'animate-pulse' : ''}`} />
        )}
        
        {/* Votes remaining badge */}
        {showRemaining && votesRemaining !== undefined && votesRemaining > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-bg-primary text-gold text-xs font-bold rounded-full flex items-center justify-center border-2 border-gold">
            {votesRemaining}
          </span>
        )}
      </button>
    );
  }
  
  // Compact variant
  if (variant === 'compact') {
    return (
      <Button
        variant="primary"
        size="sm"
        onClick={handleClick}
        disabled={isDisabled}
        loading={loading}
        className={`
          ${justVoted ? 'animate-wiggle' : ''}
          ${className}
        `}
      >
        {justVoted ? (
          <>
            <CheckIcon className="w-4 h-4 mr-1" />
            Voted!
          </>
        ) : (
          <>
            <HeartIcon className="w-4 h-4 mr-1" />
            Vote
          </>
        )}
      </Button>
    );
  }
  
  // Default variant
  return (
    <div className={`flex flex-col items-center gap-2 ${className}`}>
      <Button
        variant="primary"
        size={size}
        onClick={handleClick}
        disabled={isDisabled}
        loading={loading}
        className={`
          min-w-[140px]
          shadow-lg hover:shadow-glow-gold
          ${justVoted ? 'animate-wiggle bg-success hover:shadow-glow-success' : ''}
        `}
      >
        {justVoted ? (
          <>
            <CheckIcon className="w-5 h-5 mr-2" />
            Voted!
          </>
        ) : (
          <>
            <HeartIcon className="w-5 h-5 mr-2" />
            Vote Now
          </>
        )}
      </Button>
      
      {/* Votes remaining indicator */}
      {showRemaining && votesRemaining !== undefined && (
        <span className={`
          text-sm
          ${isOutOfVotes ? 'text-error' : 'text-text-muted'}
        `}>
          {isOutOfVotes ? (
            'No votes remaining'
          ) : (
            <>
              <span className="font-medium text-text-primary">{votesRemaining}</span>
              {maxVotes && ` / ${maxVotes}`} votes remaining
            </>
          )}
        </span>
      )}
    </div>
  );
};

/**
 * VoteButtonGroup - Multiple vote buttons for quick voting
 */
export const VoteButtonGroup = ({
  amounts = [1, 5, 10],
  onVote,
  votesRemaining,
  loading,
  className = '',
}) => {
  const [selectedAmount, setSelectedAmount] = useState(null);
  
  const handleVote = async (amount) => {
    setSelectedAmount(amount);
    await onVote?.(amount);
    setSelectedAmount(null);
  };
  
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {amounts.map((amount) => {
        const canAfford = votesRemaining === undefined || votesRemaining >= amount;
        const isLoading = loading && selectedAmount === amount;
        
        return (
          <Button
            key={amount}
            variant={amount === 1 ? 'primary' : 'secondary'}
            size="md"
            onClick={() => handleVote(amount)}
            disabled={!canAfford || loading}
            loading={isLoading}
            className={amount === 1 ? 'shadow-glow-gold' : ''}
          >
            +{amount}
          </Button>
        );
      })}
    </div>
  );
};

/**
 * FloatingVoteButton - Fixed position vote button (mobile)
 */
export const FloatingVoteButton = ({
  onClick,
  votesRemaining,
  visible = true,
  className = '',
}) => {
  if (!visible) return null;
  
  return (
    <div className={`fixed bottom-6 right-6 z-50 ${className}`}>
      <VoteButton
        onClick={onClick}
        votesRemaining={votesRemaining}
        variant="icon"
        size="lg"
        className="shadow-2xl"
      />
    </div>
  );
};

// Icon components
const HeartIcon = ({ className }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24">
    <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
  </svg>
);

const CheckIcon = ({ className }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
  </svg>
);

const LoadingSpinner = ({ className }) => (
  <svg className={`animate-spin ${className}`} fill="none" viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
  </svg>
);

export default VoteButton;
