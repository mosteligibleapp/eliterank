import React, { useState } from 'react';
import { LaunchForm, LaunchSuccess } from '../features/launch';

/**
 * Public-facing /launch page. A simple sales lead form — sales follows up
 * within 1-2 business days. The richer post-sale onboarding flow lives
 * elsewhere (see git history for the wizard prototype).
 */
export default function LaunchCompetitionPage() {
  const [submission, setSubmission] = useState(null);

  if (submission) {
    return (
      <LaunchSuccess
        submission={submission}
        onSubmitAnother={() => {
          setSubmission(null);
          if (typeof window !== 'undefined') window.scrollTo({ top: 0 });
        }}
      />
    );
  }

  return <LaunchForm onSubmitted={setSubmission} />;
}
