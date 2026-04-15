import { useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { usePublicCompetition } from '../../../contexts/PublicCompetitionContext';

/**
 * Contestant profile page (direct URL access)
 * Opens the contestant profile modal automatically
 */
export function ContestantView() {
  const { contestantSlug } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const {
    getContestantBySlug,
    openContestantProfile,
    loading,
  } = usePublicCompetition();

  useEffect(() => {
    if (loading) return;

    const contestant = getContestantBySlug(contestantSlug);

    if (contestant) {
      openContestantProfile(contestant);
    } else {
      // Contestant not found — strip the trailing /e/:contestantSlug off
      // the current URL to go back to the competition page. Derived from
      // location.pathname so it works for all URL formats (slug, ID,
      // legacy /c/...) and we preserve query params like ?preview=voting.
      const basePath = location.pathname.replace(/\/e\/[^/]+\/?$/, '') || '/';
      navigate(`${basePath}${location.search || ''}`, { replace: true });
    }
  }, [
    contestantSlug,
    loading,
    getContestantBySlug,
    openContestantProfile,
    navigate,
    location.pathname,
    location.search,
  ]);

  // Return null - modal is rendered at layout level
  return null;
}

export default ContestantView;
