import { usePublicCompetition } from '../../../contexts/PublicCompetitionContext';
import { ExternalLink, Crown } from 'lucide-react';

/**
 * About section with tagline and description
 */
export function AboutSection() {
  const { about, organization } = usePublicCompetition();

  if (!about?.tagline && !about?.description) return null;

  return (
    <div className="about-section">
      {about.tagline && (
        <blockquote className="about-tagline">
          "{about.tagline}"
        </blockquote>
      )}

      {about.description && (
        <p className="about-description">{about.description}</p>
      )}

      <div className="about-links">
        {organization?.logo_url && (
          <a
            href={organization.website_url || '#'}
            target="_blank"
            rel="noopener noreferrer"
            className="about-link-card"
          >
            <div className="about-link-logo">
              <img src={organization.logo_url} alt={organization.name} />
            </div>
            <div className="about-link-content">
              <span className="about-link-label">Presented by</span>
              <span className="about-link-name">{organization.name}</span>
            </div>
            <ExternalLink size={14} className="about-link-arrow" />
          </a>
        )}

        <a
          href="/about"
          className="about-link-card"
        >
          <div className="about-link-logo about-link-logo-eliterank">
            <Crown size={20} />
          </div>
          <div className="about-link-content">
            <span className="about-link-label">Powered by</span>
            <span className="about-link-name">EliteRank</span>
          </div>
          <ExternalLink size={14} className="about-link-arrow" />
        </a>
      </div>
    </div>
  );
}

export default AboutSection;
