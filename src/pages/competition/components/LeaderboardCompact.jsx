import { usePublicCompetition } from '../../../contexts/PublicCompetitionContext';
import { Crown, AlertTriangle, TrendingUp, TrendingDown } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

/**
 * Prominent leaderboard showcasing contestants
 * Large images, contestants are the FOCUS
 */
export function LeaderboardCompact() {
  const {
    topThree,
    contestants,
    dangerZone,
    openContestantProfile,
    openVoteModal,
    orgSlug,
    citySlug,
    year,
  } = usePublicCompetition();

  const navigate = useNavigate();

  const basePath = year
    ? `/c/${orgSlug}/${citySlug}/${year}`
    : `/c/${orgSlug}/${citySlug}`;

  // Show all contestants after top 3 (up to 6 more for compact view)
  const displayContestants = contestants?.slice(3, 9) || [];

  // Format number with commas
  const formatVotes = (num) => {
    if (!num) return '0';
    return num.toLocaleString();
  };

  // Get rank change indicator
  const getRankChange = (contestant) => {
    const trend = contestant.trend || 0;
    if (trend > 0) return { direction: 'up', value: trend };
    if (trend < 0) return { direction: 'down', value: Math.abs(trend) };
    return null;
  };

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

      {/* Top 3 - Large Prominent Display */}
      <div className="leaderboard-top3">
        {/* 2nd Place */}
        {topThree?.[1] && (
          <div
            className="contestant-spotlight contestant-second"
            onClick={() => openContestantProfile(topThree[1])}
          >
            <div className="spotlight-rank silver">2</div>
            <div className="spotlight-photo">
              {topThree[1].avatar_url ? (
                <img src={topThree[1].avatar_url} alt={topThree[1].name} />
              ) : (
                <span className="spotlight-initial">{topThree[1].name?.charAt(0)}</span>
              )}
            </div>
            <span className="spotlight-name">{topThree[1].name?.split(' ')[0]}</span>
            <span className="spotlight-votes">{formatVotes(topThree[1].votes)} votes</span>
            <button
              className="spotlight-vote-btn"
              onClick={(e) => { e.stopPropagation(); openVoteModal(topThree[1]); }}
            >
              Vote
            </button>
          </div>
        )}

        {/* 1st Place - Largest */}
        {topThree?.[0] && (
          <div
            className="contestant-spotlight contestant-first"
            onClick={() => openContestantProfile(topThree[0])}
          >
            <div className="spotlight-crown">
              <Crown size={24} />
            </div>
            <div className="spotlight-rank gold">1</div>
            <div className="spotlight-photo spotlight-photo-large">
              {topThree[0].avatar_url ? (
                <img src={topThree[0].avatar_url} alt={topThree[0].name} />
              ) : (
                <span className="spotlight-initial">{topThree[0].name?.charAt(0)}</span>
              )}
            </div>
            <span className="spotlight-name">{topThree[0].name?.split(' ')[0]}</span>
            <span className="spotlight-votes">{formatVotes(topThree[0].votes)} votes</span>
            <button
              className="spotlight-vote-btn spotlight-vote-btn-primary"
              onClick={(e) => { e.stopPropagation(); openVoteModal(topThree[0]); }}
            >
              Vote
            </button>
          </div>
        )}

        {/* 3rd Place */}
        {topThree?.[2] && (
          <div
            className="contestant-spotlight contestant-third"
            onClick={() => openContestantProfile(topThree[2])}
          >
            <div className="spotlight-rank bronze">3</div>
            <div className="spotlight-photo">
              {topThree[2].avatar_url ? (
                <img src={topThree[2].avatar_url} alt={topThree[2].name} />
              ) : (
                <span className="spotlight-initial">{topThree[2].name?.charAt(0)}</span>
              )}
            </div>
            <span className="spotlight-name">{topThree[2].name?.split(' ')[0]}</span>
            <span className="spotlight-votes">{formatVotes(topThree[2].votes)} votes</span>
            <button
              className="spotlight-vote-btn"
              onClick={(e) => { e.stopPropagation(); openVoteModal(topThree[2]); }}
            >
              Vote
            </button>
          </div>
        )}
      </div>

      {/* Remaining Contestants Grid */}
      {displayContestants.length > 0 && (
        <div className="leaderboard-grid">
          {displayContestants.map(contestant => {
            const isDanger = contestant.zone === 'danger';
            const rankChange = getRankChange(contestant);

            return (
              <div
                key={contestant.id}
                className={`contestant-card-compact ${isDanger ? 'danger' : ''}`}
                onClick={() => openContestantProfile(contestant)}
              >
                <div className="card-rank">#{contestant.displayRank}</div>
                <div className="card-photo">
                  {contestant.avatar_url ? (
                    <img src={contestant.avatar_url} alt={contestant.name} />
                  ) : (
                    <span className="card-initial">{contestant.name?.charAt(0)}</span>
                  )}
                </div>
                <div className="card-info">
                  <span className="card-name">{contestant.name?.split(' ')[0]}</span>
                  <span className="card-votes">{formatVotes(contestant.votes)}</span>
                  {isDanger && (
                    <span className="card-danger-badge">
                      <AlertTriangle size={10} />
                      At Risk
                    </span>
                  )}
                </div>
                <button
                  className="card-vote-btn"
                  onClick={(e) => { e.stopPropagation(); openVoteModal(contestant); }}
                >
                  Vote
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Danger Zone Summary */}
      {dangerZone?.length > 0 && (
        <div className="danger-zone-summary">
          <AlertTriangle size={12} />
          <span>{dangerZone.length} contestants at risk of elimination</span>
        </div>
      )}

      {/* View All Link */}
      <button
        className="leaderboard-view-all"
        onClick={() => navigate(`${basePath}/leaderboard`)}
      >
        View All {contestants?.length || 0} Contestants
      </button>
    </div>
  );
}

export default LeaderboardCompact;
