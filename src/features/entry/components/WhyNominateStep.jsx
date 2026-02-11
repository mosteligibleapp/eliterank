import React from 'react';
import { getCompetitionTitle } from '../utils/eligibilityEngine';

const MAX_CHARS = 150;

/**
 * Nomination: Why are you nominating them? 150 chars
 */
export default function WhyNominateStep({
  reason,
  onChange,
  onNext,
  error,
  competition,
  nomineeName,
}) {
  const title = getCompetitionTitle(competition);
  const remaining = MAX_CHARS - (reason?.length || 0);

  return (
    <div className="entry-step entry-step-why">
      <h2 className="entry-step-title">Why {nomineeName || 'them'}?</h2>
      <p className="entry-step-subtitle">
        Why should they be in <strong>{title}</strong>? This will appear on their card.
      </p>

      <div className="entry-form-field">
        <textarea
          className="entry-textarea"
          value={reason}
          onChange={(e) => {
            if (e.target.value.length <= MAX_CHARS) {
              onChange(e.target.value);
            }
          }}
          placeholder="They deserve this because..."
          maxLength={MAX_CHARS}
          rows={4}
        />
        <span className={`entry-char-count ${remaining < 20 ? 'low' : ''}`}>
          {remaining} characters left
        </span>
      </div>

      {error && <p className="entry-error">{error}</p>}

      <button
        className="entry-btn-primary"
        onClick={onNext}
      >
        Continue
      </button>
    </div>
  );
}
