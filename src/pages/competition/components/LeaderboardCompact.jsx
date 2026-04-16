import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { usePublicCompetition } from '../../../contexts/PublicCompetitionContext';
import { AlertTriangle, Calendar } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import CrownIcon from '../../../components/ui/icons/CrownIcon';
import EliteRankCrown from '../../../components/ui/icons/EliteRankCrown';
import { formatEventTime } from '../../../utils/formatters';

/**
 * Fisher-Yates shuffle — returns a new array in random order.
 */
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

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
    openVoteModal,
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
  const stripTrailing = (p) => p.replace(/\/(leaderboard|activity|enter)\/?$/, '').replace(/\/$/, '');
  const basePath = stripTrailing(location.pathname);
  const leaderboardPath = `${basePath}/leaderboard${location.search || ''}`;

  // Between rounds, clicking a contestant navigates to their public
  // profile page (the same URL a contestant would share) — vote modal
  // is meaningless with voting paused. During active voting the card
  // click takes you straight into the vote flow.
  const openContestantPage = (contestant) => {
    if (!contestant?.slug) return;
    navigate(`${basePath}/e/${contestant.slug}${location.search || ''}`);
  };
  const handleCardClick = isBetweenRounds ? openContestantPage : openVoteModal;

  // Find the next upcoming event (if any)
  const nextEvent = useMemo(() => {
    if (!events?.length) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = today.toISOString().split('T')[0];
    const sorted = [...events].sort((a, b) => {
      if (!a.date) return 1;
      if (!b.date) return -1;
      return new Date(a.date) - new Date(b.date);
    });
    return sorted.find(e => !e.date || e.date.split('T')[0] >= todayStr) || null;
  }, [events]);

  // Reserve the bottom-left grid slot for the event card when available.
  // 3-column grid → bottom-left is position 7 (index 6) in a 9-cell grid.
  const maxContestants = nextEvent ? 8 : 9;
  const allContestants = contestants?.slice(0, maxContestants) || [];

  // Between rounds: rotate (shuffle) the grid every 4 seconds with a
  // fade transition so the page feels alive while no voting is happening.
  const [shuffled, setShuffled] = useState(allContestants);
  const [fading, setFading] = useState(false);
  const sourceRef = useRef(allContestants);

  // Keep source in sync when contestants data changes
  useEffect(() => {
    sourceRef.current = allContestants;
    if (!isBetweenRounds) {
      setShuffled(allContestants);
    }
  }, [allContestants, isBetweenRounds]);

  // Shuffle interval during between-rounds
  useEffect(() => {
    if (!isBetweenRounds || sourceRef.current.length < 2) return;

    // Initial shuffle so it doesn't start in rank order
    setShuffled(shuffle(sourceRef.current));

    const interval = setInterval(() => {
      setFading(true);
      setTimeout(() => {
        setShuffled(shuffle(sourceRef.current));
        setFading(false);
      }, 400); // fade-out duration
    }, 4000);

    return () => clearInterval(interval);
  }, [isBetweenRounds]);

  const displayContestants = isBetweenRounds ? shuffled : allContestants;

  // Format number with commas
  const formatVotes = (num) => {
    if (!num) return '0';
    return num.toLocaleString();
  };

  return (
    <div className="leaderboard-prominent">
      <div className="leaderboard-header">
        <h3>
          <EliteRankCrown size={18} />
          Leaderboard
        </h3>
        <span className="live-indicator">
          <span className="live-dot" />
          Live
        </span>
      </div>

      {/* All Contestants - Unified Portrait Grid */}
      <div className={`portrait-grid ${fading ? 'portrait-grid-fading' : ''}`}>
        {displayContestants.slice(0, 6).map((contestant, index) => (
          <PortraitCard
            key={contestant.id}
            contestant={contestant}
            rank={index + 1}
            numberOfWinners={numberOfWinners}
            hideRank={isBetweenRounds}
            hideVotes={isBetweenRounds}
            hideDanger={isBetweenRounds}
            onVote={handleCardClick}
          />
        ))}

        {/* Bottom-left slot: upcoming event card (if available) */}
        {nextEvent && <EventPortraitCard event={nextEvent} />}

        {displayContestants.slice(6).map((contestant, index) => (
          <PortraitCard
            key={contestant.id}
            contestant={contestant}
            rank={index + 7}
            numberOfWinners={numberOfWinners}
            hideRank={isBetweenRounds}
            hideVotes={isBetweenRounds}
            hideDanger={isBetweenRounds}
            onVote={handleCardClick}
          />
        ))}
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

/**
 * Compact event card that fits inside the portrait grid.
 * Mirrors the portrait-card dimensions so it blends with contestant cards.
 */
function EventPortraitCard({ event }) {
  const imageUrl = event.imageUrl || event.image_url;
  const ticketUrl = event.ticketUrl || event.ticket_url;
  const location = event.location || event.venue;

  const formatDateBadge = (dateStr, timeStr) => {
    if (!dateStr) return 'Date TBD';
    const eventDate = new Date(dateStr + 'T00:00:00');
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const isToday = eventDate.getTime() === today.getTime();
    const datePart = isToday
      ? 'TODAY'
      : eventDate
          .toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
          .toUpperCase();
    if (timeStr) return `${datePart} · ${formatEventTime(timeStr)}`;
    return datePart;
  };

  const Wrapper = ticketUrl ? 'a' : 'div';
  const wrapperProps = ticketUrl
    ? { href: ticketUrl, target: '_blank', rel: 'noopener noreferrer' }
    : {};

  return (
    <Wrapper {...wrapperProps} className="portrait-card portrait-card-event">
      <div className="portrait-image-wrap">
        {imageUrl ? (
          <img src={imageUrl} alt={event.name} className="portrait-image" />
        ) : (
          <div className="portrait-placeholder">
            <Calendar size={28} />
          </div>
        )}
        <span className="portrait-event-badge">
          <Calendar size={10} />
          Event
        </span>
        <span className="portrait-event-date">
          {formatDateBadge(event.date, event.time)}
        </span>
      </div>
      <div className="portrait-info">
        <span className="portrait-name">{event.name}</span>
        {location && <span className="portrait-votes">{location}</span>}
      </div>
    </Wrapper>
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

export default LeaderboardCompact;
