import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePublicCompetition } from '../../../contexts/PublicCompetitionContext';
import { PortraitCard } from '../components/LeaderboardCompact';
import { Search, X } from 'lucide-react';

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Full leaderboard page - reuses the same portrait-card grid as the
 * compact sidebar leaderboard so the two surfaces stay visually consistent.
 * On the full page the grid has more room, so the cards render larger.
 */
export function LeaderboardView() {
  const {
    contestants,
    competition,
    phase,
    openVoteModal,
  } = usePublicCompetition();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');

  // Clicking a contestant card navigates to their shareable public profile
  const handleContestantClick = useCallback((contestant) => {
    if (contestant.user_id) {
      navigate(`/profile/${contestant.user_id}`);
    } else {
      openVoteModal(contestant);
    }
  }, [openVoteModal, navigate]);

  // Top N contestants render the EliteRank crown badge instead of a rank
  // number — where N is the competition's configured winner count.
  const numberOfWinners = competition?.number_of_winners || 1;

  // Between rounds: hide rank badges + vote counts (no active voting).
  const isBetweenRounds = phase?.phase === 'between-rounds';

  // Filter contestants by search query
  const filtered = useMemo(() => {
    if (!contestants) return [];
    if (!search.trim()) return contestants;
    const q = search.trim().toLowerCase();
    return contestants.filter(c =>
      c.name?.toLowerCase().includes(q) ||
      c.city?.toLowerCase().includes(q)
    );
  }, [contestants, search]);

  // Between rounds: rotate the grid every 4s (paused while searching)
  const [shuffled, setShuffled] = useState([]);
  const [fading, setFading] = useState(false);
  const sourceRef = useRef(filtered);
  const isRotating = isBetweenRounds && !search.trim();

  useEffect(() => {
    sourceRef.current = filtered;
    if (!isRotating) setShuffled(filtered);
  }, [filtered, isRotating]);

  useEffect(() => {
    if (!isRotating || sourceRef.current.length < 2) return;
    setShuffled(shuffle(sourceRef.current));
    const interval = setInterval(() => {
      setFading(true);
      setTimeout(() => {
        setShuffled(shuffle(sourceRef.current));
        setFading(false);
      }, 400);
    }, 4000);
    return () => clearInterval(interval);
  }, [isRotating]);

  const displayContestants = isRotating ? shuffled : filtered;

  return (
    <div className="leaderboard-full">
      {/* Search bar */}
      <div className="leaderboard-search">
        <Search size={18} className="leaderboard-search-icon" />
        <input
          type="text"
          placeholder="Search contestants..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="leaderboard-search-input"
        />
        {search && (
          <button
            className="leaderboard-search-clear"
            onClick={() => setSearch('')}
            aria-label="Clear search"
          >
            <X size={16} />
          </button>
        )}
      </div>

      <div className={`portrait-grid ${fading ? 'portrait-grid-fading' : ''}`}>
        {displayContestants.map((contestant, index) => (
          <PortraitCard
            key={contestant.id}
            contestant={contestant}
            rank={contestant.displayRank || index + 1}
            numberOfWinners={numberOfWinners}
            hideRank={isBetweenRounds}
            hideVotes={isBetweenRounds}
            hideDanger={isBetweenRounds}
            onVote={handleContestantClick}
          />
        ))}
      </div>

      {/* Empty state */}
      {filtered.length === 0 && (
        <div className="leaderboard-empty">
          <p>{search ? 'No contestants match your search' : 'No contestants yet'}</p>
        </div>
      )}
    </div>
  );
}

export default LeaderboardView;
