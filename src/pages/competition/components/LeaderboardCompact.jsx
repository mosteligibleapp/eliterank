import { useState, useCallback, useEffect, useRef } from 'react';
import { usePublicCompetition } from '../../../contexts/PublicCompetitionContext';
import { Crown, AlertTriangle, Calendar } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import CrownIcon from '../../../components/ui/icons/CrownIcon';
import { formatEventTime } from '../../../utils/formatters';

const ROTATE_INTERVAL = 5000; // Rotate displayed contestants every 5 seconds

/**
 * Image-focused leaderboard - contestants are the STARS
 * Large portrait cards, minimal UI chrome
 */
export function LeaderboardCompact() {
  const {
    contestants,
    competition,
    phase,
    dangerZone,
    events,
  } = usePublicCompetition();

  // Top N contestants are "winners" and get the EliteRank crown badge
  // instead of a rank number. Driven by the competition's configured
  // number_of_winners so every competition behaves correctly.
  const numberOfWinners = competition?.number_of_winners || 1;

  // During the interim between-rounds phase we hide rank badges and vote
  // counts — no active voting is happening, so showing ranks/votes would
  // be misleading.
  const isBetweenRounds = phase?.phase === 'between-rounds';

  const navigate = useNavigate();
  const location = useLocation();

  // Build the leaderboard URL from the current path so it works across all
  // URL formats (slug, ID, legacy) and preserves query params like
  // ?preview=voting when a host is previewing the voting page.
  const stripTrailing = (p) => p.replace(/\/(leaderboard|prizes|activity|enter)\/?$/, '').replace(/\/$/, '');
  const basePath = stripTrailing(location.pathname);
  const leaderboardPath = `${basePath}/leaderboard${location.search || ''}`;

  // Clicking a contestant navigates to their public profile page.
  const handleCardClick = (contestant) => {
    if (!contestant?.user_id) return;
    navigate(`/profile/${contestant.user_id}`);
  };

  // Next upcoming event to display in the grid
  const nextEvent = (() => {
    if (!events?.length) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const sorted = [...events].sort((a, b) => {
      if (!a.date) return 1;
      if (!b.date) return -1;
      return new Date(a.date) - new Date(b.date);
    });
    return sorted.find(e => {
      if (!e.date) return true;
      return e.date.split('T')[0] >= today.toISOString().split('T')[0];
    }) || null;
  })();

  // When an event card is included the grid has (contestants + 1) items.
  // Desktop is 3 columns, mobile is 2 columns. Pick a contestant count
  // so total items fill complete rows on both layouts (divisible by 6).
  // 11 + 1 = 12 (4×3, 6×2). Without event, 9 works for 3-col (3×3).
  const maxWithEvent = 11;
  const maxWithoutEvent = 9;
  const maxContestants = nextEvent ? maxWithEvent : maxWithoutEvent;
  const displayCount = Math.min(contestants?.length || 0, maxContestants);

  // Rotate which contestants are visible every few seconds so all
  // contestants get exposure on the compact grid.
  const [rotationOffset, setRotationOffset] = useState(0);
  const isPaused = useRef(false);
  const totalContestants = contestants?.length || 0;
  const shouldRotate = totalContestants > displayCount;

  useEffect(() => {
    if (!shouldRotate) return;
    const timer = setInterval(() => {
      if (!isPaused.current) {
        setRotationOffset(prev => (prev + displayCount) % totalContestants);
      }
    }, ROTATE_INTERVAL);
    return () => clearInterval(timer);
  }, [shouldRotate, displayCount, totalContestants]);

  // Reset offset when contestant list changes
  useEffect(() => {
    setRotationOffset(0);
  }, [totalContestants]);

  // Build the visible slice, wrapping around when offset + count exceeds total
  const allContestants = (() => {
    if (!contestants?.length) return [];
    if (!shouldRotate) return contestants.slice(0, displayCount);
    const result = [];
    for (let i = 0; i < displayCount; i++) {
      result.push(contestants[(rotationOffset + i) % totalContestants]);
    }
    return result;
  })();

  return (
    <div className="leaderboard-prominent">
      <div className="leaderboard-header">
        <h3>
          <Crown size={18} />
          Leaderboard
        </h3>
        <span className="live-indicator">
          <span className="live-dot" />
          Live
        </span>
      </div>

      {/* All Contestants - Unified Portrait Grid */}
      <div
        className="portrait-grid"
        onMouseEnter={() => { isPaused.current = true; }}
        onMouseLeave={() => { isPaused.current = false; }}
      >
        {allContestants.map((contestant, index) => {
          // Use the contestant's actual position in the full ranked list
          const actualRank = shouldRotate
            ? (rotationOffset + index) % totalContestants + 1
            : index + 1;
          return (
            <PortraitCard
              key={contestant.id}
              contestant={contestant}
              rank={actualRank}
              numberOfWinners={numberOfWinners}
              hideRank={isBetweenRounds}
              hideVotes={isBetweenRounds}
              hideDanger={isBetweenRounds}
              onVote={handleCardClick}
            />
          );
        })}
        {nextEvent && (
          <EventGridCard event={nextEvent} />
        )}
      </div>

      {/* Danger Zone Summary — hidden between rounds, since nothing is
          actively being voted on */}
      {!isBetweenRounds && dangerZone?.length > 0 && (
        <div className="danger-zone-summary">
          <AlertTriangle size={12} />
          <span>{dangerZone.length} contestants at risk of elimination</span>
        </div>
      )}

      {/* View All Link */}
      <button
        className="leaderboard-view-all"
        onClick={() => navigate(leaderboardPath)}
      >
        View All Contestants
      </button>
    </div>
  );
}

export function PortraitCard({
  contestant,
  rank,
  numberOfWinners = 1,
  hideRank = false,
  hideVotes = false,
  hideDanger = false,
  onVote,
}) {
  const [imgFailed, setImgFailed] = useState(false);
  const [imgLoaded, setImgLoaded] = useState(false);
  const handleError = useCallback(() => setImgFailed(true), []);
  const handleLoad = useCallback(() => setImgLoaded(true), []);

  const isDanger = !hideDanger && contestant.zone === 'danger';
  const isWinner = rank <= numberOfWinners;
  const showImg = contestant.avatar_url && !imgFailed;

  return (
    <div
      className={`portrait-card ${isDanger ? 'at-risk' : ''}`}
      onClick={() => onVote(contestant)}
    >
      <div className="portrait-image-wrap">
        <div className="portrait-placeholder">
          {contestant.name?.charAt(0)}
        </div>
        {showImg && (
          <img
            src={contestant.avatar_url}
            alt={contestant.name}
            className="portrait-image"
            style={{ opacity: imgLoaded ? 1 : 0, transition: 'opacity 0.2s ease' }}
            onLoad={handleLoad}
            onError={handleError}
          />
        )}
        {!hideRank && (isWinner ? (
          <span
            className="portrait-rank portrait-rank-winner"
            aria-label={`Winner rank ${rank}`}
          >
            <CrownIcon size={14} color="#0a0a0f" />
          </span>
        ) : (
          <span className="portrait-rank">#{rank}</span>
        ))}
        {isDanger && (
          <span className="portrait-danger">
            <AlertTriangle size={12} />
            At Risk
          </span>
        )}
      </div>
      <div className="portrait-info">
        <span className="portrait-name">{contestant.name?.split(' ')[0]}</span>
        {!hideVotes && (
          <span className="portrait-votes">{contestant.votes ? contestant.votes.toLocaleString() : '0'}</span>
        )}
      </div>
    </div>
  );
}

/**
 * EventGridCard — event flyer rendered as a portrait-card so it fits
 * seamlessly into the contestant grid at the same size.
 */
function EventGridCard({ event }) {
  const imageUrl = event.imageUrl || event.image_url;
  const ticketUrl = event.ticketUrl || event.ticket_url;
  const eventLocation = event.location || event.venue;

  const formatDate = (dateStr, timeStr) => {
    if (!dateStr) return 'Date TBD';
    const eventDate = new Date(dateStr + 'T00:00:00');
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const isToday = eventDate.getTime() === today.getTime();
    const datePart = isToday
      ? 'TODAY'
      : eventDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }).toUpperCase();
    if (timeStr) return `${datePart} \u2022 ${formatEventTime(timeStr)}`;
    return datePart;
  };

  const card = (
    <div className="portrait-card">
      <div className="portrait-image-wrap">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={event.name}
            className="portrait-image"
            style={{ opacity: 1 }}
          />
        ) : (
          <div className="portrait-placeholder">
            <Calendar size={24} />
          </div>
        )}
        {/* Date badge — positioned like the rank badge */}
        <span
          className="portrait-rank"
          style={{ fontSize: '10px', padding: '2px 8px', letterSpacing: '0.3px' }}
        >
          {formatDate(event.date, event.time)}
        </span>
      </div>
      <div className="portrait-info">
        <span className="portrait-name">{event.name}</span>
        {eventLocation && (
          <span className="portrait-votes">{eventLocation}</span>
        )}
      </div>
    </div>
  );

  if (ticketUrl) {
    return (
      <a href={ticketUrl} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none', color: 'inherit' }}>
        {card}
      </a>
    );
  }
  return card;
}

export default LeaderboardCompact;
