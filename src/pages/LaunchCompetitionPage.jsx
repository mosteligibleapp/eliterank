import React, { useState } from 'react';
import { LaunchSuccess, LaunchWizard } from '../features/launch';

/**
 * Public-facing /launch page. Wraps the wizard and toggles to a success
 * screen on submit. No auth required — top-of-funnel form.
 */
export default function LaunchCompetitionPage() {
  const [submission, setSubmission] = useState(null);

  if (submission) {
    return (
      <LaunchSuccess
        submission={submission}
        onSubmitAnother={() => {
          // Force a remount so the wizard hook re-reads (now-cleared) draft state.
          setSubmission(null);
          if (typeof window !== 'undefined') window.scrollTo({ top: 0 });
        }}
      />
    );
  }

  return <LaunchWizard onSubmitted={setSubmission} />;
}
