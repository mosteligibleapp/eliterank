import { Routes, Route } from 'react-router-dom';
import { CompetitionLayout } from './CompetitionLayout';

// Phase views
import { CompetitionMainView } from './views/CompetitionMainView';
import { LeaderboardView } from './views/LeaderboardView';
import { ActivityView } from './views/ActivityView';
import { ContestantView } from './views/ContestantView';

/**
 * Competition routes configuration
 * Nested under /c/:orgSlug/:citySlug/:year?
 */
export function CompetitionRoutes() {
  return (
    <Routes>
      {/* With year */}
      <Route path=":orgSlug/:citySlug/:year" element={<CompetitionLayout />}>
        <Route index element={<CompetitionMainView />} />
        <Route path="leaderboard" element={<LeaderboardView />} />
        <Route path="activity" element={<ActivityView />} />
        <Route path="e/:contestantSlug" element={<ContestantView />} />
      </Route>

      {/* Without year (defaults to current/latest) */}
      <Route path=":orgSlug/:citySlug" element={<CompetitionLayout />}>
        <Route index element={<CompetitionMainView />} />
        <Route path="leaderboard" element={<LeaderboardView />} />
        <Route path="activity" element={<ActivityView />} />
        <Route path="e/:contestantSlug" element={<ContestantView />} />
      </Route>
    </Routes>
  );
}

export default CompetitionRoutes;
