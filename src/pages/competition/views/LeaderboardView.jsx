import { usePublicCompetition } from '../../../contexts/PublicCompetitionContext';

/**
 * Full leaderboard page
 */
export function LeaderboardView() {
  const {
    contestants,
    topThree,
    dangerZone,
    leaderboardStats,
    sortBy,
    changeSort,
    openContestantProfile,
  } = usePublicCompetition();

  return (
    <div className="leaderboard-view">
      <div className="leaderboard-header">
        <h2>Leaderboard</h2>
        <p className="leaderboard-stats">
          {leaderboardStats?.totalContestants} competing ·{' '}
          {leaderboardStats?.totalVotes?.toLocaleString()} votes
        </p>
      </div>

      {/* Sort controls */}
      <div className="leaderboard-controls">
        <span>Sort by:</span>
        {['rank', 'votes', 'recent'].map((sort) => (
          <button
            key={sort}
            onClick={() => changeSort(sort)}
            className={`sort-btn ${sortBy === sort ? 'active' : ''}`}
          >
            {sort.charAt(0).toUpperCase() + sort.slice(1)}
          </button>
        ))}
      </div>

      {/* Top 3 Podium */}
      {topThree?.length > 0 && (
        <div className="leaderboard-podium">
          <h3>Top 3</h3>
          <div className="podium-grid">
            {topThree.map((contestant) => (
              <div
                key={contestant.id}
                className={`podium-item podium-${contestant.displayRank}`}
                onClick={() => openContestantProfile(contestant)}
              >
                {contestant.avatar_url ? (
                  <img
                    src={contestant.avatar_url}
                    alt={contestant.name}
                    className="podium-avatar"
                  />
                ) : (
                  <div className="podium-avatar-placeholder">
                    {contestant.name?.charAt(0)}
                  </div>
                )}
                <span className="podium-rank">#{contestant.displayRank}</span>
                <span className="podium-name">{contestant.name}</span>
                <span className="podium-votes">
                  {contestant.votes?.toLocaleString()} votes
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* All Contestants Grid */}
      <div className="leaderboard-grid">
        {contestants?.map((contestant) => (
          <div
            key={contestant.id}
            className={`leaderboard-card ${contestant.zone}`}
            onClick={() => openContestantProfile(contestant)}
          >
            {contestant.avatar_url ? (
              <img
                src={contestant.avatar_url}
                alt={contestant.name}
                className="card-avatar"
              />
            ) : (
              <div className="card-avatar-placeholder">
                {contestant.name?.charAt(0)}
              </div>
            )}
            <div className="card-info">
              <span className="card-rank">#{contestant.displayRank}</span>
              <span className="card-name">{contestant.name}</span>
              <span className="card-votes">
                {contestant.votes?.toLocaleString()} votes
              </span>
            </div>
            {contestant.zone === 'danger' && (
              <span className="card-danger">Elimination Zone</span>
            )}
            {contestant.trend === 'up' && (
              <span className="card-trend trend-up">Rising</span>
            )}
            {contestant.trend === 'down' && (
              <span className="card-trend trend-down">Falling</span>
            )}
          </div>
        ))}
      </div>

      {/* Empty state */}
      {(!contestants || contestants.length === 0) && (
        <div className="empty-state">
          <p>No contestants yet</p>
        </div>
      )}

      <p className="placeholder-note">
        Phase 5: Enhance with your existing contestant card components
      </p>
    </div>
  );
}

export default LeaderboardView;
