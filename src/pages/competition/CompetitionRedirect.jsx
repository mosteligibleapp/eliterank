import { useParams, Navigate, Routes, Route } from 'react-router-dom';

/**
 * Redirect old URL format to new format
 * /c/chicago → /c/most-eligible/chicago
 *
 * Assumes 'most-eligible' as default org for legacy URLs.
 */
export function CompetitionRedirect() {
  const { citySlug } = useParams();

  // Default organization for legacy URLs
  const defaultOrg = 'most-eligible';

  return <Navigate to={`/c/${defaultOrg}/${citySlug}`} replace />;
}

/**
 * Redirect helper for any old routes
 */
export function LegacyRedirects() {
  return (
    <Routes>
      {/* Old format: /c/:city → /c/most-eligible/:city */}
      <Route path=":citySlug" element={<CompetitionRedirect />} />
    </Routes>
  );
}

export default CompetitionRedirect;
