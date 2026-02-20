import React from 'react';
import Avatar from '../components/Avatar';
import Badge from '../components/Badge';
import { RankDisplay, VoteCount, TrendIndicator } from '../components/Stats';

/**
 * LeaderboardRow - A single row in a leaderboard
 * 
 * Displays rank, avatar, name, and vote count in a clean, data-forward layout.
 * Inspired by Kalshi's trustworthy data presentation.
 * 
 * @example
 * <LeaderboardRow
 *   rank={1}
 *   user={{ name: 'Alex Johnson', image: '...' }}
 *   votes={1234}
 *   trend={5.2}
 *   onClick={() => {}}
 * />
 */

const LeaderboardRow = ({
  rank,
  user,
  votes,
  trend,
  badge,
  isCurrentUser = false,
  showTrend = true,
  onClick,
  className = '',
}) => {
  const isTopThree = rank <= 3;
  
  return (
    <div
      className={`
        flex items-center gap-4 p-4
        ${isTopThree ? 'bg-bg-card' : 'bg-bg-secondary'}
        ${isCurrentUser ? 'ring-1 ring-gold/30 bg-gold/5' : ''}
        ${onClick ? 'cursor-pointer hover:bg-bg-elevated transition-colors' : ''}
        rounded-xl
        ${className}
      `}
      onClick={onClick}
    >
      {/* Rank */}
      <div className="flex-shrink-0 w-12">
        <RankDisplay rank={rank} size="md" />
      </div>
      
      {/* Avatar and Name */}
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <Avatar
          src={user.image || user.avatar}
          name={user.name}
          size="md"
          rank={isTopThree ? rank : undefined}
        />
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className={`
              font-medium truncate
              ${isCurrentUser ? 'text-gold' : 'text-text-primary'}
            `}>
              {user.name}
            </span>
            {isCurrentUser && (
              <Badge variant="gold" size="sm">You</Badge>
            )}
            {badge && (
              <Badge variant={badge.variant || 'tag'} size="sm">
                {badge.text}
              </Badge>
            )}
          </div>
          {user.subtitle && (
            <span className="text-sm text-text-muted truncate block">
              {user.subtitle}
            </span>
          )}
        </div>
      </div>
      
      {/* Votes and Trend */}
      <div className="flex items-center gap-4 flex-shrink-0">
        {showTrend && trend !== undefined && (
          <TrendIndicator value={trend} size="sm" />
        )}
        <VoteCount count={votes} size="sm" showLabel={false} />
      </div>
    </div>
  );
};

/**
 * Leaderboard - Full leaderboard component
 */
export const Leaderboard = ({
  entries = [],
  currentUserId,
  showTrend = true,
  onRowClick,
  maxVisible,
  loading = false,
  className = '',
}) => {
  const visibleEntries = maxVisible ? entries.slice(0, maxVisible) : entries;
  const hasMore = maxVisible && entries.length > maxVisible;
  
  if (loading) {
    return (
      <div className={`space-y-2 ${className}`}>
        {Array.from({ length: maxVisible || 5 }).map((_, i) => (
          <LeaderboardRowSkeleton key={i} />
        ))}
      </div>
    );
  }
  
  return (
    <div className={`space-y-2 ${className}`}>
      {visibleEntries.map((entry, index) => (
        <LeaderboardRow
          key={entry.id || index}
          rank={entry.rank || index + 1}
          user={entry.user || entry}
          votes={entry.votes}
          trend={entry.trend}
          badge={entry.badge}
          isCurrentUser={entry.userId === currentUserId || entry.id === currentUserId}
          showTrend={showTrend}
          onClick={onRowClick ? () => onRowClick(entry) : undefined}
        />
      ))}
      
      {hasMore && (
        <div className="text-center py-3">
          <span className="text-sm text-text-muted">
            +{entries.length - maxVisible} more
          </span>
        </div>
      )}
    </div>
  );
};

/**
 * LeaderboardRowSkeleton - Loading state
 */
export const LeaderboardRowSkeleton = () => (
  <div className="flex items-center gap-4 p-4 bg-bg-secondary rounded-xl animate-pulse">
    <div className="w-8 h-8 bg-bg-hover rounded-full" />
    <div className="w-10 h-10 bg-bg-hover rounded-full" />
    <div className="flex-1">
      <div className="h-4 bg-bg-hover rounded w-32" />
    </div>
    <div className="h-6 bg-bg-hover rounded w-16" />
  </div>
);

/**
 * TopThreeDisplay - Special display for top 3 contestants
 */
export const TopThreeDisplay = ({
  entries = [],
  onSelect,
  className = '',
}) => {
  // Reorder for podium display: 2nd, 1st, 3rd
  const [first, second, third] = entries;
  const podiumOrder = [second, first, third].filter(Boolean);
  
  return (
    <div className={`flex items-end justify-center gap-4 ${className}`}>
      {podiumOrder.map((entry, index) => {
        const actualRank = index === 0 ? 2 : index === 1 ? 1 : 3;
        const isFirst = actualRank === 1;
        
        return (
          <div
            key={entry?.id || index}
            className={`
              flex flex-col items-center
              ${isFirst ? 'order-2' : index === 0 ? 'order-1' : 'order-3'}
              ${onClick ? 'cursor-pointer' : ''}
            `}
            onClick={() => onSelect?.(entry)}
          >
            {/* Avatar with rank */}
            <div className="relative mb-2">
              <Avatar
                src={entry?.user?.image || entry?.image}
                name={entry?.user?.name || entry?.name}
                size={isFirst ? '2xl' : 'xl'}
                rank={actualRank}
                className={isFirst ? 'shadow-glow-gold' : ''}
              />
            </div>
            
            {/* Name */}
            <span className={`
              font-medium text-text-primary text-center truncate max-w-[100px]
              ${isFirst ? 'text-base' : 'text-sm'}
            `}>
              {entry?.user?.name || entry?.name}
            </span>
            
            {/* Votes */}
            <span className={`
              text-text-muted
              ${isFirst ? 'text-sm' : 'text-xs'}
            `}>
              {formatNumber(entry?.votes || 0)} votes
            </span>
            
            {/* Podium */}
            <div 
              className={`
                mt-3 rounded-t-lg flex items-center justify-center
                ${isFirst 
                  ? 'w-24 h-20 bg-gradient-to-t from-gold-600 to-gold-400' 
                  : actualRank === 2
                    ? 'w-20 h-14 bg-gradient-to-t from-zinc-500 to-zinc-400'
                    : 'w-20 h-10 bg-gradient-to-t from-amber-700 to-amber-600'
                }
              `}
            >
              <span className="text-2xl font-bold text-bg-primary">
                {actualRank}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
};

function formatNumber(num) {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
  return num.toLocaleString();
}

export default LeaderboardRow;
