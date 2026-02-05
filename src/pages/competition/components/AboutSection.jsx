import { usePublicCompetition } from '../../../contexts/PublicCompetitionContext';

/**
 * About section with tagline and description
 */
export function AboutSection() {
  const { about } = usePublicCompetition();

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
    </div>
  );
}

export default AboutSection;
