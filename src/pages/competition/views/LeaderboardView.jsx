import { useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePublicCompetition } from '../../../contexts/PublicCompetitionContext';
import { PortraitCard } from '../components/LeaderboardCompact';
import { Search, X } from 'lucide-react';

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

      <div className="portrait-grid">
        {filtered.map((contestant, index) => (
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
