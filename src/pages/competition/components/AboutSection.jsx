import { usePublicCompetition } from '../../../contexts/PublicCompetitionContext';

/**
 * About section with description
 */
export function AboutSection() {
  const { about } = usePublicCompetition();

  if (!about?.description) return null;

  return (
    <div className="about-section">
      <p className="about-description">{about.description}</p>
    </div>
  );
}

export default AboutSection;
