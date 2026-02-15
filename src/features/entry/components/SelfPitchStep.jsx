import React from 'react';
import { getCompetitionTitle } from '../utils/eligibilityEngine';

const MAX_CHARS = 150;

/**
 * Bio step: "Tell people about yourself"
 */
export default function SelfPitchStep({
  bio,
  onChange,
  onSubmit,
  isSubmitting,
  error,
  competition,
}) {
  const title = getCompetitionTitle(competition);
  const cityName = competition?.cityData?.name || competition?.city || '';
  const remaining = MAX_CHARS - (bio?.length || 0);

  return (
    <div className="entry-step entry-step-pitch">
      <h2 className="entry-step-title">Your bio</h2>
      <p className="entry-step-subtitle">
        Tell people why you should win <strong>{title}</strong>.
      </p>

      <div className="entry-form-field">
        <textarea
          className="entry-textarea"
          value={bio}
          onChange={(e) => {
            if (e.target.value.length <= MAX_CHARS) {
              onChange(e.target.value);
            }
          }}
          placeholder="A little about me..."
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
