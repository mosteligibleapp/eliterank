import useAppSettings from '../../../hooks/useAppSettings';
import { EliteRankCrown } from '../../../components/ui/icons';

/**
 * Trust-transfer strip for new competitions (Season 1 in a city).
 *
 * Surfaces platform-wide proof points (cumulative voters, attendees, seasons)
 * from `app_settings.platform_stats` so a brand-new market borrows EliteRank's
 * track record. Renders nothing when the setting is missing — never fakes
 * numbers.
 *
 * Setting shape:
 *   { voters: number, attendees: number, seasons: number, tagline?: string }
 */
export function PoweredByEliteRank() {
  const { data: stats, loading } = useAppSettings('platform_stats');

  if (loading || !stats) return null;

  const items = [
    stats.voters ? { value: formatCount(stats.voters), label: 'voters' } : null,
    stats.attendees ? { value: formatCount(stats.attendees), label: 'live attendees' } : null,
    stats.seasons ? { value: String(stats.seasons), label: stats.seasons === 1 ? 'season' : 'seasons' } : null,
  ].filter(Boolean);

  if (items.length === 0) return null;

  return (
    <section className="powered-by-eliterank">
      <div className="powered-by-eliterank-header">
        <EliteRankCrown size={20} className="powered-by-eliterank-crown" />
        <span className="powered-by-eliterank-label">Powered by EliteRank</span>
      </div>
      {stats.tagline && (
        <p className="powered-by-eliterank-tagline">{stats.tagline}</p>
      )}
      <div className="powered-by-eliterank-stats">
        {items.map((item) => (
          <div key={item.label} className="powered-by-eliterank-stat">
            <span className="powered-by-eliterank-value">{item.value}</span>
            <span className="powered-by-eliterank-stat-label">{item.label}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

function formatCount(n) {
  if (n >= 1000) {
    const k = n / 1000;
    return `${k % 1 === 0 ? k : k.toFixed(1)}K+`;
  }
  return `${n}+`;
}

export default PoweredByEliteRank;
