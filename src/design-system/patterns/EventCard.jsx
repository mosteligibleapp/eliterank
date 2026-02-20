import React from 'react';
import Card from '../components/Card';
import Badge from '../components/Badge';
import Avatar, { AvatarGroup } from '../components/Avatar';
import { CountdownTimer, VoteCount } from '../components/Stats';
import Button from '../components/Button';

/**
 * EventCard - Posh-inspired event/competition card
 * 
 * Features:
 * - Full-bleed cover image
 * - Status indicators (live, voting, completed, upcoming)
 * - Date/time display
 * - Participant previews
 * - Entry/view CTAs
 * 
 * @example
 * <EventCard
 *   event={{
 *     id: '1',
 *     title: "NYC's Hottest DJ",
 *     image: '/events/dj-battle.jpg',
 *     date: '2024-12-15',
 *     time: '9:00 PM',
 *     venue: 'Brooklyn Steel',
 *     status: 'live',
 *     participants: [...],
 *     totalVotes: 12345,
 *   }}
 *   onView={() => {}}
 *   onEnter={() => {}}
 * />
 */

const EventCard = ({
  event,
  variant = 'default', // default, featured, compact, minimal
  onView,
  onEnter,
  className = '',
}) => {
  const {
    id,
    title,
    subtitle,
    description,
    image,
    date,
    time,
    endTime,
    venue,
    location,
    status = 'upcoming',
    participants = [],
    totalVotes,
    totalEntries,
    prize,
    tags = [],
  } = event;
  
  const isFeatured = variant === 'featured';
  const isCompact = variant === 'compact';
  const isMinimal = variant === 'minimal';
  const isLive = status === 'live';
  const isEnded = status === 'completed' || status === 'ended';
  
  // Format date
  const formattedDate = date ? new Date(date).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  }) : null;
  
  // Minimal variant - just image and title
  if (isMinimal) {
    return (
      <Card
        variant="interactive"
        padding="none"
        onClick={onView}
        className={`group overflow-hidden ${className}`}
      >
        <div className="relative aspect-[3/4]">
          <img
            src={image}
            alt={title}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-bg-primary via-transparent to-transparent" />
          
          {/* Status badge */}
          {status && (
            <div className="absolute top-3 left-3">
              <Badge variant={getStatusVariant(status)}>
                {getStatusLabel(status)}
              </Badge>
            </div>
          )}
          
          {/* Title at bottom */}
          <div className="absolute bottom-0 left-0 right-0 p-4">
            <h3 className="text-lg font-bold text-text-primary line-clamp-2">
              {title}
            </h3>
            {formattedDate && (
              <p className="text-sm text-text-secondary mt-1">{formattedDate}</p>
            )}
          </div>
        </div>
      </Card>
    );
  }
  
  // Compact variant - horizontal layout
  if (isCompact) {
    return (
      <Card
        variant="interactive"
        padding="none"
        onClick={onView}
        className={`group ${className}`}
      >
        <div className="flex gap-4 p-4">
          {/* Thumbnail */}
          <div className="relative w-20 h-20 flex-shrink-0 rounded-lg overflow-hidden">
            <img
              src={image}
              alt={title}
              className="w-full h-full object-cover"
            />
            {isLive && (
              <div className="absolute top-1 left-1">
                <Badge variant="live" size="sm" />
              </div>
            )}
          </div>
          
          {/* Info */}
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-text-primary truncate group-hover:text-gold transition-colors">
              {title}
            </h3>
            <p className="text-sm text-text-secondary mt-0.5">
              {formattedDate} {time && `• ${time}`}
            </p>
            {venue && (
              <p className="text-sm text-text-muted truncate">
                {venue}
              </p>
            )}
          </div>
          
          {/* Stats */}
          {totalVotes && (
            <div className="flex-shrink-0 text-right">
              <VoteCount count={totalVotes} size="sm" showLabel={false} />
            </div>
          )}
        </div>
      </Card>
    );
  }
  
  // Default and Featured variants
  return (
    <Card
      variant={isFeatured ? 'featured' : 'interactive'}
      padding="none"
      className={`group overflow-hidden ${className}`}
    >
      {/* Cover Image */}
      <div className={`relative ${isFeatured ? 'aspect-[16/9]' : 'aspect-[4/3]'} overflow-hidden`}>
        <img
          src={image}
          alt={title}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
        
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-bg-card via-bg-card/40 to-transparent" />
        
        {/* Status badge */}
        <div className="absolute top-4 left-4 flex gap-2">
          {status && (
            <Badge variant={getStatusVariant(status)}>
              {getStatusLabel(status)}
            </Badge>
          )}
          {prize && (
            <Badge variant="gold">
              {typeof prize === 'string' ? prize : `$${prize.toLocaleString()}`}
            </Badge>
          )}
        </div>
        
        {/* Countdown for live/upcoming events */}
        {(isLive || status === 'voting') && endTime && (
          <div className="absolute top-4 right-4">
            <div className="bg-bg-primary/80 backdrop-blur-sm rounded-lg px-3 py-2">
              <span className="text-xs text-text-muted block mb-1">
                {isLive ? 'Ends in' : 'Starts in'}
              </span>
              <CountdownTimer endTime={endTime} size="sm" showLabels={false} />
            </div>
          </div>
        )}
        
        {/* Title overlay at bottom */}
        <div className="absolute bottom-0 left-0 right-0 p-5">
          <h3 className={`
            font-bold text-text-primary
            ${isFeatured ? 'text-2xl' : 'text-xl'}
            line-clamp-2
          `}>
            {title}
          </h3>
          {subtitle && (
            <p className="text-text-secondary mt-1">{subtitle}</p>
          )}
        </div>
      </div>
      
      {/* Content */}
      <div className="p-5">
        {/* Date, Time, Venue */}
        <div className="flex items-center gap-4 text-sm text-text-secondary mb-4">
          {formattedDate && (
            <span className="flex items-center gap-1.5">
              <CalendarIcon className="w-4 h-4" />
              {formattedDate}
            </span>
          )}
          {time && (
            <span className="flex items-center gap-1.5">
              <ClockIcon className="w-4 h-4" />
              {time}
            </span>
          )}
          {(venue || location) && (
            <span className="flex items-center gap-1.5 truncate">
              <LocationIcon className="w-4 h-4" />
              {venue || location}
            </span>
          )}
        </div>
        
        {/* Tags */}
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-4">
            {tags.slice(0, 3).map(tag => (
              <Badge key={tag} variant="tag" size="sm">{tag}</Badge>
            ))}
          </div>
        )}
        
        {/* Participants preview */}
        {participants.length > 0 && (
          <div className="flex items-center justify-between mb-4 pb-4 border-b border-border">
            <AvatarGroup
              users={participants}
              max={5}
              size="sm"
            />
            <span className="text-sm text-text-muted">
              {totalEntries || participants.length} contestants
            </span>
          </div>
        )}
        
        {/* Stats and CTA */}
        <div className="flex items-center justify-between">
          {totalVotes !== undefined && (
            <VoteCount count={totalVotes} size="sm" />
          )}
          
          <div className="flex gap-2">
            {onView && (
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onView(event);
                }}
              >
                View
              </Button>
            )}
            {onEnter && !isEnded && (
              <Button
                variant="primary"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onEnter(event);
                }}
              >
                {isLive ? 'Vote Now' : 'Enter'}
              </Button>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
};

/**
 * EventCardSkeleton - Loading state
 */
export const EventCardSkeleton = ({ variant = 'default' }) => {
  if (variant === 'compact') {
    return (
      <Card variant="default" padding="none">
        <div className="flex gap-4 p-4 animate-pulse">
          <div className="w-20 h-20 bg-bg-hover rounded-lg" />
          <div className="flex-1">
            <div className="h-5 bg-bg-hover rounded w-3/4 mb-2" />
            <div className="h-4 bg-bg-hover rounded w-1/2" />
          </div>
        </div>
      </Card>
    );
  }
  
  return (
    <Card variant="default" padding="none">
      <div className="animate-pulse">
        <div className="aspect-[4/3] bg-bg-hover" />
        <div className="p-5">
          <div className="h-4 bg-bg-hover rounded w-2/3 mb-4" />
          <div className="flex gap-4 mb-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="w-6 h-6 bg-bg-hover rounded-full" />
            ))}
          </div>
          <div className="flex justify-between">
            <div className="h-8 bg-bg-hover rounded w-20" />
            <div className="h-8 bg-bg-hover rounded w-24" />
          </div>
        </div>
      </div>
    </Card>
  );
};

/**
 * EventGrid - Grid layout for event cards
 */
export const EventGrid = ({
  events = [],
  variant = 'default',
  onView,
  onEnter,
  loading = false,
  loadingCount = 6,
  className = '',
}) => {
  if (loading) {
    return (
      <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 ${className}`}>
        {Array.from({ length: loadingCount }).map((_, i) => (
          <EventCardSkeleton key={i} variant={variant} />
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
      {events.map((event) => (
        <EventCard
          key={event.id}
          event={event}
          variant={variant}
          onView={onView}
          onEnter={onEnter}
        />
      ))}
    </div>
  );
};

// Helper functions
function getStatusVariant(status) {
  const variants = {
    live: 'live',
    voting: 'voting',
    completed: 'completed',
    ended: 'completed',
    upcoming: 'info',
    draft: 'default',
  };
  return variants[status] || 'default';
}

function getStatusLabel(status) {
  const labels = {
    live: 'LIVE',
    voting: 'VOTING',
    completed: 'ENDED',
    ended: 'ENDED',
    upcoming: 'UPCOMING',
    draft: 'DRAFT',
  };
  return labels[status] || status.toUpperCase();
}

// Icon components
const CalendarIcon = ({ className }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
  </svg>
);

const ClockIcon = ({ className }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const LocationIcon = ({ className }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);

export default EventCard;
