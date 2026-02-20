import React from 'react';
import Card, { CardBody, CardImage } from '../components/Card';
import Avatar from '../components/Avatar';
import Badge from '../components/Badge';
import { VoteCount, RankDisplay } from '../components/Stats';
import Button from '../components/Button';

/**
 * ContestantCard - The primary card for displaying a contestant
 * 
 * Combines multiple design system components into a cohesive pattern
 * for displaying contestants in competitions.
 * 
 * @example
 * <ContestantCard
 *   contestant={{
 *     id: '1',
 *     name: 'Alex Johnson',
 *     image: '/avatars/alex.jpg',
 *     coverImage: '/covers/alex.jpg',
 *     bio: 'NYC based DJ...',
 *     votes: 1234,
 *     rank: 2,
 *     tags: ['House', 'Techno'],
 *     trend: 5.2,
 *   }}
 *   onVote={() => {}}
 *   onView={() => {}}
 * />
 */

const ContestantCard = ({
  contestant,
  onVote,
  onView,
  variant = 'default', // default, compact, featured
  showVoteButton = true,
  showTrend = true,
  className = '',
}) => {
  const {
    id,
    name,
    image,
    coverImage,
    bio,
    votes = 0,
    rank,
    tags = [],
    trend,
    status,
  } = contestant;
  
  const isFeatured = variant === 'featured' || rank === 1;
  const isCompact = variant === 'compact';
  
  // Compact variant - horizontal layout
  if (isCompact) {
    return (
      <Card
        variant="interactive"
        padding="none"
        className={`group ${className}`}
        onClick={onView}
      >
        <div className="flex items-center p-4 gap-4">
          {/* Rank */}
          {rank && (
            <RankDisplay rank={rank} size="md" />
          )}
          
          {/* Avatar */}
          <Avatar
            src={image}
            name={name}
            size="lg"
            rank={rank <= 3 ? rank : undefined}
          />
          
          {/* Info */}
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-text-primary truncate">
              {name}
            </h3>
            {tags.length > 0 && (
              <div className="flex gap-1 mt-1">
                {tags.slice(0, 2).map(tag => (
                  <Badge key={tag} variant="tag" size="sm">{tag}</Badge>
                ))}
              </div>
            )}
          </div>
          
          {/* Votes */}
          <VoteCount count={votes} trend={showTrend ? trend : undefined} size="sm" />
          
          {/* Vote button */}
          {showVoteButton && (
            <Button
              variant="primary"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onVote?.(contestant);
              }}
            >
              Vote
            </Button>
          )}
        </div>
      </Card>
    );
  }
  
  // Default and Featured variants - vertical layout
  return (
    <Card
      variant={isFeatured ? 'featured' : 'interactive'}
      padding="none"
      className={`group overflow-hidden ${className}`}
      onClick={onView}
    >
      {/* Cover Image / Header */}
      <div className="relative aspect-[4/3] overflow-hidden">
        {coverImage ? (
          <img
            src={coverImage}
            alt=""
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-bg-elevated to-bg-hover" />
        )}
        
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-bg-card via-bg-card/20 to-transparent" />
        
        {/* Rank badge */}
        {rank && rank <= 3 && (
          <div className="absolute top-3 left-3">
            <RankDisplay rank={rank} size="lg" />
          </div>
        )}
        
        {/* Status badge */}
        {status && (
          <div className="absolute top-3 right-3">
            <Badge variant={status}>{status.toUpperCase()}</Badge>
          </div>
        )}
        
        {/* Avatar - positioned at bottom of cover */}
        <div className="absolute -bottom-6 left-5">
          <Avatar
            src={image}
            name={name}
            size="xl"
            border
            className="shadow-lg"
          />
        </div>
      </div>
      
      {/* Content */}
      <CardBody className="pt-8 pb-5 px-5">
        {/* Name and tags */}
        <div className="mb-3">
          <h3 className="text-lg font-semibold text-text-primary group-hover:text-gold transition-colors">
            {name}
          </h3>
          {tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {tags.slice(0, 3).map(tag => (
                <Badge key={tag} variant="tag" size="sm">{tag}</Badge>
              ))}
            </div>
          )}
        </div>
        
        {/* Bio excerpt */}
        {bio && !isCompact && (
          <p className="text-sm text-text-secondary line-clamp-2 mb-4">
            {bio}
          </p>
        )}
        
        {/* Stats and action */}
        <div className="flex items-center justify-between pt-3 border-t border-border">
          <VoteCount 
            count={votes} 
            trend={showTrend ? trend : undefined} 
            size="md"
          />
          
          {showVoteButton && (
            <Button
              variant="primary"
              size="md"
              onClick={(e) => {
                e.stopPropagation();
                onVote?.(contestant);
              }}
              className="shadow-glow-gold"
            >
              <HeartIcon className="w-4 h-4 mr-1.5" />
              Vote
            </Button>
          )}
        </div>
      </CardBody>
    </Card>
  );
};

/**
 * ContestantCardSkeleton - Loading state
 */
export const ContestantCardSkeleton = ({ variant = 'default' }) => {
  if (variant === 'compact') {
    return (
      <Card variant="default" padding="none">
        <div className="flex items-center p-4 gap-4 animate-pulse">
          <div className="w-8 h-8 bg-bg-hover rounded-full" />
          <div className="w-12 h-12 bg-bg-hover rounded-full" />
          <div className="flex-1">
            <div className="h-4 bg-bg-hover rounded w-24 mb-2" />
            <div className="h-3 bg-bg-hover rounded w-16" />
          </div>
          <div className="h-10 w-16 bg-bg-hover rounded-lg" />
        </div>
      </Card>
    );
  }
  
  return (
    <Card variant="default" padding="none">
      <div className="animate-pulse">
        <div className="aspect-[4/3] bg-bg-hover" />
        <div className="p-5 pt-8">
          <div className="h-5 bg-bg-hover rounded w-32 mb-2" />
          <div className="h-3 bg-bg-hover rounded w-48 mb-4" />
          <div className="flex justify-between items-center pt-3 border-t border-border">
            <div className="h-8 bg-bg-hover rounded w-20" />
            <div className="h-10 bg-bg-hover rounded w-24" />
          </div>
        </div>
      </div>
    </Card>
  );
};

/**
 * ContestantGrid - Grid layout for contestant cards
 */
export const ContestantGrid = ({
  contestants = [],
  variant = 'default',
  onVote,
  onView,
  loading = false,
  loadingCount = 6,
  className = '',
}) => {
  if (loading) {
    return (
      <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 ${className}`}>
        {Array.from({ length: loadingCount }).map((_, i) => (
          <ContestantCardSkeleton key={i} variant={variant} />
        ))}
      </div>
    );
  }
  
  return (
    <div 
      className={`
        ${variant === 'compact' 
          ? 'flex flex-col gap-3' 
          : 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'
        }
        ${className}
      `}
    >
      {contestants.map((contestant) => (
        <ContestantCard
          key={contestant.id}
          contestant={contestant}
          variant={variant}
          onVote={onVote}
          onView={() => onView?.(contestant)}
        />
      ))}
    </div>
  );
};

// Icon component
const HeartIcon = ({ className }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24">
    <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
  </svg>
);

export default ContestantCard;
