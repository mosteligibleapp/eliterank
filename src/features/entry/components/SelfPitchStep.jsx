import React from 'react';
import { getCompetitionTitle } from '../utils/eligibilityEngine';

const MAX_CHARS = 150;

/**
 * Self-entry pitch: "Why are you the [title] in [city]?"
 */
export default function SelfPitchStep({
  pitch,
  onChange,
  onSubmit,
  isSubmitting,
  error,
  competition,
}) {
  const title = getCompetitionTitle(competition);
  const cityName = competition?.cityData?.name || competition?.city || '';
  const remaining = MAX_CHARS - (pitch?.length || 0);

  return (
    <div className="entry-step entry-step-pitch">
      <h2 className="entry-step-title">Your pitch</h2>
      <p className="entry-step-subtitle">
        Why are you the <strong>{title}</strong>{cityName ? ` in ${cityName}` : ''}?
      </p>

      <div className="entry-form-field">
        <textarea
          className="entry-textarea"
          value={pitch}
          onChange={(e) => {
            if (e.target.value.length <= MAX_CHARS) {
              onChange(e.target.value);
            }
          }}
          placeholder="I'm the one because..."
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
        onClick={onSubmit}
        disabled={isSubmitting}
      >
        {isSubmitting ? 'Submitting...' : 'Submit Entry'}
      </button>
    </div>
  );
}
