import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { usePublicCompetition } from '../../../contexts/PublicCompetitionContext';

/**
 * Contestant profile page (direct URL access)
 * Opens the contestant profile modal automatically
 */
export function ContestantView() {
  const { contestantSlug } = useParams();
  const navigate = useNavigate();
  const {
    getContestantBySlug,
    openContestantProfile,
    orgSlug,
    citySlug,
    year,
    loading,
  } = usePublicCompetition();

  useEffect(() => {
    if (loading) return;

    const contestant = getContestantBySlug(contestantSlug);

    if (contestant) {
      openContestantProfile(contestant);
    } else {
      // Contestant not found - redirect to main
      const basePath = year
        ? `/c/${orgSlug}/${citySlug}/${year}`
        : `/c/${orgSlug}/${citySlug}`;
      navigate(basePath, { replace: true });
    }
  }, [
    contestantSlug,
    loading,
    getContestantBySlug,
    openContestantProfile,
    navigate,
    orgSlug,
    citySlug,
    year,
  ]);

  // Return null - modal is rendered at layout level
  return null;
}

export default ContestantView;
