import { usePublicCompetition } from '../../../contexts/PublicCompetitionContext';
import { useNavigate } from 'react-router-dom';
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
  Info
} from 'lucide-react';

const iconMap = {
  'vote': CheckCircle,
  'trending-up': TrendingUp,
  'trending-down': TrendingDown,
  'crown': Crown,
  'trophy': Trophy,
  'dollar-sign': DollarSign,
  'eye': Eye,
  'share-2': Share2,
  'clock': Clock,
  'info': Info,
};

/**
 * Compact activity feed for sidebar
 */
export function ActivityFeedCompact({ limit = 4 }) {
  const {
    activities,
    orgSlug,
    citySlug,
    year
  } = usePublicCompetition();

  const navigate = useNavigate();

  const basePath = year
    ? `/c/${orgSlug}/${citySlug}/${year}`
    : `/c/${orgSlug}/${citySlug}`;

  const displayActivities = activities?.slice(0, limit) || [];

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

          return (
            <div
              key={activity.id}
              className={`activity-item-compact ${isHighlight ? 'highlight' : ''}`}
            >
              <IconComponent size={14} className="activity-icon" />
              <div className="activity-content">
                <span className="activity-message">{activity.message}</span>
                <span className="activity-time">{activity.timeAgo}</span>
              </div>
            </div>
          );
        })}

        {displayActivities.length === 0 && (
          <p className="activity-empty">No activity yet</p>
        )}
      </div>

      <button
        className="activity-view-all"
        onClick={() => navigate(`${basePath}/activity`)}
      >
        View All Activity
      </button>
    </div>
  );
}

export default ActivityFeedCompact;
