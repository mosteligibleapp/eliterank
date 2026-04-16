import { usePublicCompetition } from '../../../contexts/PublicCompetitionContext';
import {
  CheckCircle,
  TrendingUp,
  TrendingDown,
  Crown,
  Trophy,
  DollarSign,
  Eye,
  Share2,
  Clock,
  Info,
  Heart
} from 'lucide-react';

const iconMap = {
  'vote': Heart,
  'trending-up': TrendingUp,
  'trending-down': TrendingDown,
  'crown': Crown,
  'trophy': Trophy,
  'dollar-sign': DollarSign,
  'eye': Eye,
  'share-2': Share2,
  'clock': Clock,
  'info': Info,
  'check-circle': CheckCircle,
};

/**
 * Format relative time (e.g., "2m", "1h", "3d")
 */
function formatRelativeTime(date) {
  if (!date) return '';

  const now = new Date();
  const then = new Date(date);
  const diffMs = now - then;
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);

  if (diffSec < 60) return 'now';
  if (diffMin < 60) return `${diffMin}m`;
  if (diffHr < 24) return `${diffHr}h`;
  if (diffDay < 7) return `${diffDay}d`;
  return `${Math.floor(diffDay / 7)}w`;
}

/**
 * Compact activity feed for sidebar
 */
export function ActivityFeedCompact({ limit = 5 }) {
  const {
    activities,
    contestants,
  } = usePublicCompetition();

  const displayActivities = activities?.slice(0, limit) || [];

  // Find contestant by ID for avatar
  const getContestant = (contestantId) => {
    return contestants?.find(c => c.id === contestantId);
  };

  return (
    <div className="activity-feed-compact">
      <div className="activity-feed-header">
        <span className="live-dot" />
        <span>Live Activity</span>
      </div>

      <div className="activity-list-compact">
        {displayActivities.map(activity => {
          const IconComponent = iconMap[activity.typeInfo?.icon] || Info;
          const isHighlight = activity.activity_type?.includes('milestone');
          const contestant = activity.contestant_id ? getContestant(activity.contestant_id) : null;
          const relativeTime = formatRelativeTime(activity.created_at);

          return (
            <div
              key={activity.id}
              className={`activity-item-compact ${isHighlight ? 'highlight' : ''}`}
            >
              {/* User avatar or icon */}
              {contestant?.avatar_url ? (
                <div className="activity-avatar">
                  <img src={contestant.avatar_url} alt="" />
                </div>
              ) : (
                <div className="activity-icon-wrap">
                  <IconComponent size={12} className="activity-icon" />
                </div>
              )}
              <div className="activity-content">
                <span className="activity-message">{activity.message}</span>
                <span className="activity-time">{relativeTime}</span>
              </div>
            </div>
          );
        })}

        {displayActivities.length === 0 && (
          <p className="activity-empty">No activity yet</p>
        )}
      </div>

    </div>
  );
}

export default ActivityFeedCompact;
