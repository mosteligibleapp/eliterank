import { usePublicCompetition } from '../../../contexts/PublicCompetitionContext';
import { Award } from 'lucide-react';

/**
 * Judges section - displays competition judges in a responsive grid
 */
export function JudgesSection() {
  const { judges } = usePublicCompetition();

  if (!judges || judges.length === 0) return null;

  return (
    <div className="judges-section">
      <div className="judges-header">
        <Award size={22} className="judges-icon" />
        <h2 className="judges-title">Meet the Judges</h2>
      </div>

      <div className="judges-grid" data-count={judges.length}>
        {judges.map((judge) => (
          <div key={judge.id} className="judge-card">
            <div className="judge-avatar">
              {judge.avatar_url ? (
                <img src={judge.avatar_url} alt={judge.name} />
              ) : (
                <span>{judge.name?.charAt(0)}</span>
              )}
            </div>
            <h3 className="judge-name">{judge.name}</h3>
            {judge.title && <p className="judge-title">{judge.title}</p>}
            {judge.bio && <p className="judge-bio">{judge.bio}</p>}
          </div>
        ))}
      </div>
    </div>
  );
}

export default JudgesSection;
