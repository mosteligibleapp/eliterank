import { useState, useEffect } from 'react';
import { User } from 'lucide-react';
import { usePublicCompetition } from '../../../contexts/PublicCompetitionContext';
import useAppSettings from '../../../hooks/useAppSettings';
import { EliteRankCrown } from '../../../components/ui/icons';
import { supabase } from '../../../lib/supabase';

/**
 * Hall of Winners section for competition pages
 * Shows the explore page Hall of Winners on selected competition pages
 * Only displays during Coming Soon and Nominations phases
 */
export function HallOfWinnersSection() {
  const { competition } = usePublicCompetition();
  const { data: hallOfWinners, loading } = useAppSettings('hall_of_winners');
  const [instagramMap, setInstagramMap] = useState({});

  const shouldDisplay = hallOfWinners?.displayOnCompetitions?.includes(competition?.id);
  const winners = hallOfWinners?.winners || [];

  // Fetch instagram handles for winners from their profiles
  useEffect(() => {
    if (!winners.length) return;
    const profileIds = winners.slice(0, 5).map(w => w.profileId).filter(Boolean);
    if (!profileIds.length) return;

    supabase
      .from('profiles')
      .select('id, instagram')
      .in('id', profileIds)
      .then(({ data }) => {
        if (data) {
          const map = {};
          data.forEach(p => { if (p.instagram) map[p.id] = p.instagram; });
          setInstagramMap(map);
        }
      });
  }, [winners]);

  if (loading || !hallOfWinners || !shouldDisplay || !winners.length) {
    return null;
  }

  const { year } = hallOfWinners;

  const getInstagramUrl = (winner) => {
    const handle = instagramMap[winner.profileId];
    if (!handle) return null;
    const clean = handle.replace(/^@/, '').replace(/^https?:\/\/(www\.)?instagram\.com\//, '').replace(/\/$/, '');
    return `https://instagram.com/${clean}`;
  };

  return (
    <section className="hall-of-winners-section">
      <div className="hall-of-winners-header">
        <EliteRankCrown size={28} className="hall-of-winners-crown" />
        <div className="hall-of-winners-title">
          <span className="hall-of-winners-label">ELITES</span>
          <h3>Most Eligible {year}</h3>
        </div>
      </div>

      <div className="hall-of-winners-grid">
        {winners.slice(0, 5).map((winner, index) => {
          const igUrl = getInstagramUrl(winner);
          const Wrapper = igUrl ? 'a' : 'div';
          const wrapperProps = igUrl
            ? { href: igUrl, target: '_blank', rel: 'noopener noreferrer' }
            : {};

          return (
            <Wrapper
              key={winner.id}
              className={`hall-of-winners-card${igUrl ? ' hall-of-winners-card-clickable' : ''}`}
              {...wrapperProps}
            >
              <div className="hall-of-winners-rank">{index + 1}</div>
              <div className="hall-of-winners-avatar">
                {winner.imageUrl ? (
                  <img src={winner.imageUrl} alt={winner.name} />
                ) : (
                  <User size={32} />
                )}
              </div>
              <p className="hall-of-winners-name">{winner.name}</p>
            </Wrapper>
          );
        })}
        <div className="hall-of-winners-card hall-of-winners-intro-card">
          <span className="hall-of-winners-intro-number">{competition?.number_of_winners || 5}</span>
          <span className="hall-of-winners-intro-text">Winners Each Year</span>
        </div>
      </div>
    </section>
  );
}

export default HallOfWinnersSection;
