import React from 'react';
import { CheckCircle } from 'lucide-react';
import { generateEligibilityFields } from '../utils/eligibilityEngine';

/**
 * EligibilityConfirmStep - Third-party nominees only
 * Read-only display of what the nominator confirmed.
 * "This isn't accurate" link leads to decline.
 */
export default function EligibilityConfirmStep({
  competition,
  onNext,
  onIneligible,
}) {
  const fields = generateEligibilityFields(competition);

  return (
    <div className="entry-step entry-step-eligibility-confirm">
      <h2 className="entry-step-title">Eligibility confirmed</h2>
      <p className="entry-step-subtitle">
        Your nominator confirmed you meet these requirements
      </p>

      <div className="entry-eligibility-list">
        {fields.map((field) => (
          <div
            key={field.id}
            className="entry-eligibility-item checked"
          >
            <span className="entry-eligibility-icon">
              <CheckCircle size={24} />
            </span>
            <span className="entry-eligibility-label">
              {field.getLabel(true)}
            </span>
          </div>
        ))}
      </div>

      {fields.length === 0 && (
        <p className="entry-step-subtitle" style={{ marginTop: '16px' }}>
          No specific eligibility requirements for this competition.
        </p>
      )}

      <button
        className="entry-btn-primary"
        onClick={onNext}
      >
        Looks good — continue
      </button>

      <button
        className="entry-btn-ineligible"
        onClick={onIneligible}
        type="button"
      >
        This isn't accurate
      </button>
    </div>
  );
}
