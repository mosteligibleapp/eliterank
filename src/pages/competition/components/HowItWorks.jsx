import { UserPlus, Heart, Crown } from 'lucide-react';
import { usePublicCompetition } from '../../../contexts/PublicCompetitionContext';

/**
 * How It Works — evergreen 3-step journey (Nominate → Vote → Crowned).
 *
 * Content-independent explainer used on the Coming Soon page as a fallback
 * for the Timeline: it renders until the host sets real dates, so the page
 * always explains the competition flow instead of sitting empty.
 */
export function HowItWorks() {
  const { competition } = usePublicCompetition();

  const possessive = competition?.city ? `${competition.city}'s` : "the city's";

  const steps = [
    {
      id: 'nominate',
      icon: UserPlus,
      title: 'Nominate',
      desc: `Anyone can put ${possessive} most eligible singles forward.`,
    },
    {
      id: 'vote',
      icon: Heart,
      title: 'Vote',
      desc: 'The community votes to crown its favorites over multiple rounds.',
    },
    {
      id: 'crowned',
      icon: Crown,
      title: 'Crowned',
      desc: 'The top finalists are celebrated and crowned at the finale.',
    },
  ];

  return (
    <div className="how-it-works">
      <div className="how-it-works-header">
        <h4 className="section-label">How It Works</h4>
      </div>

      <div className="how-it-works-list">
        {steps.map((step, index) => {
          const Icon = step.icon;
          return (
            <div key={step.id} className="how-it-works-item">
              <div className="how-it-works-marker">
                <div className="how-it-works-step">
                  <Icon size={14} />
                </div>
                {index < steps.length - 1 && (
                  <div className="how-it-works-line" />
                )}
              </div>
              <div className="how-it-works-content">
                <span className="how-it-works-title">{step.title}</span>
                <span className="how-it-works-desc">{step.desc}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default HowItWorks;
