import { usePublicCompetition } from '../../../contexts/PublicCompetitionContext';
import { Crown, Award, Medal, AlertTriangle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

/**
 * Compact leaderboard for sidebar/main view
 * Shows top 3 podium + next few contestants
 */
export function LeaderboardCompact() {
  const {
    topThree,
    contestants,
    openContestantProfile,
    orgSlug,
    citySlug,
    year,
  } = usePublicCompetition();

  const navigate = useNavigate();

  const basePath = year
    ? `/c/${orgSlug}/${citySlug}/${year}`
    : `/c/${orgSlug}/${citySlug}`;

  // Show top 3 + next 3
  const displayContestants = contestants?.slice(3, 6) || [];

  return (
    <div className="leaderboard-compact">
      <div className="leaderboard-header">
        <h3>
          <Crown size={16} />
          Leaderboard
        </h3>
        <span className="live-indicator">
          <span className="live-dot" />
          Live
        </span>
      </div>

      {/* Top 3 Podium */}
      <div className="leaderboard-podium-compact">
        {[1, 0, 2].map(index => {
          const contestant = topThree?.[index];
          if (!contestant) return null;

          const isFirst = index === 0;
          const Icon = index === 0 ? Crown : index === 1 ? Award : Medal;

          return (
            <div
              key={contestant.id}
              className={`podium-item podium-item-${index + 1} ${isFirst ? 'podium-first' : ''}`}
              onClick={() => openContestantProfile(contestant)}
            >
              <div className="podium-avatar">
                {contestant.avatar_url ? (
                  <img src={contestant.avatar_url} alt={contestant.name} />
                ) : (
                  <span>{contestant.name?.charAt(0)}</span>
                )}
                <span className="podium-rank">
                  <Icon size={10} />
                </span>
              </div>
              <span className="podium-name">{contestant.name?.split(' ')[0]}</span>
              <span className="podium-votes">{contestant.votes?.toLocaleString()}</span>
            </div>
          );
        })}
      </div>

      {/* Remaining contestants */}
      <div className="leaderboard-list-compact">
        {displayContestants.map(contestant => (
          <div
            key={contestant.id}
            className={`leaderboard-row ${contestant.zone === 'danger' ? 'danger-zone' : ''}`}
            onClick={() => openContestantProfile(contestant)}
          >
            <span className="row-rank">#{contestant.displayRank}</span>
            <div className="row-avatar">
              {contestant.avatar_url ? (
                <img src={contestant.avatar_url} alt={contestant.name} />
              ) : (
                <span>{contestant.name?.charAt(0)}</span>
              )}
            </div>
            <span className="row-name">
              {contestant.name}
              {contestant.zone === 'danger' && (
                <AlertTriangle size={12} className="danger-icon" />
              )}
            </span>
            <span className="row-votes">{contestant.votes?.toLocaleString()}</span>
          </div>
        ))}
      </div>

      {/* View All Link */}
      <button
        className="leaderboard-view-all"
        onClick={() => navigate(`${basePath}/leaderboard`)}
      >
        View All {contestants?.length} Contestants
      </button>
    </div>
  );
}

export default LeaderboardCompact;
