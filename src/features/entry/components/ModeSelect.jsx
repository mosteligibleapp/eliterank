import React from 'react';
import { User, Users } from 'lucide-react';

/**
 * Step 1: Choose between self-entry and nominating someone
 */
export default function ModeSelect({ onSelectMode, competitionTitle }) {
  return (
    <div className="entry-step entry-step-mode">
      <h2 className="entry-step-title">Who are you entering?</h2>
      <p className="entry-step-subtitle">
        Enter yourself or nominate someone for {competitionTitle || 'this competition'}
      </p>

      <div className="entry-mode-options">
        <button
          className="entry-mode-card"
          onClick={() => onSelectMode('self')}
        >
          <div className="entry-mode-icon">
            <User size={32} />
          </div>
          <span className="entry-mode-label">Enter Myself</span>
          <span className="entry-mode-desc">I want to compete</span>
        </button>

        <button
          className="entry-mode-card"
          onClick={() => onSelectMode('nominate')}
        >
          <div className="entry-mode-icon">
            <Users size={32} />
          </div>
          <span className="entry-mode-label">Nominate Someone</span>
          <span className="entry-mode-desc">I know the perfect person</span>
        </button>
      </div>
    </div>
  );
}
