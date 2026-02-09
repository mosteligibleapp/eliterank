import React from 'react';
import { CheckCircle, Circle } from 'lucide-react';
import { generateEligibilityFields } from '../utils/eligibilityEngine';

/**
 * Step 2: Eligibility confirmation checkboxes
 * All fields must be confirmed before continuing
 */
export default function EligibilityStep({
  competition,
  isSelf,
  answers,
  onToggle,
  onNext,
}) {
  const fields = generateEligibilityFields(competition);
  const allConfirmed = fields.length > 0 && fields.every((f) => answers[f.id] === true);

  return (
    <div className="entry-step entry-step-eligibility">
      <h2 className="entry-step-title">
        {isSelf ? 'Confirm your eligibility' : 'Confirm their eligibility'}
      </h2>
      <p className="entry-step-subtitle">
        {isSelf
          ? 'Tap each requirement to confirm'
          : 'Confirm the person you\'re nominating meets these requirements'}
      </p>

      <div className="entry-eligibility-list">
        {fields.map((field) => {
          const checked = answers[field.id] === true;
          return (
            <button
              key={field.id}
              className={`entry-eligibility-item ${checked ? 'checked' : ''}`}
              onClick={() => onToggle(field.id, !checked)}
              type="button"
            >
              <span className="entry-eligibility-icon">
                {checked ? (
                  <CheckCircle size={24} />
                ) : (
                  <Circle size={24} />
                )}
              </span>
              <span className="entry-eligibility-label">
                {field.getLabel(isSelf)}
              </span>
            </button>
          );
        })}
      </div>

      {fields.length === 0 && (
        <p className="entry-step-subtitle" style={{ marginTop: '16px' }}>
          No specific eligibility requirements for this competition.
        </p>
      )}

      <button
        className="entry-btn-primary"
        disabled={fields.length > 0 && !allConfirmed}
        onClick={onNext}
      >
        {fields.length === 0 ? 'Continue' : allConfirmed ? "I'm eligible — continue" : 'Confirm all to continue'}
      </button>
    </div>
  );
}
