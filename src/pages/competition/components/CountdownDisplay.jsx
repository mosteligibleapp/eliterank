import { usePublicCompetition } from '../../../contexts/PublicCompetitionContext';
import { Clock, Calendar } from 'lucide-react';

/**
 * Countdown timer display
 *
 * @param {string} label - What we're counting down to
 * @param {boolean} large - Large display variant
 * @param {boolean} showPlaceholder - Show placeholder when no countdown data
 */
export function CountdownDisplay({ label, large = false, showPlaceholder = true }) {
  const { countdown } = usePublicCompetition();

  // If no countdown data, show placeholder
  if (!countdown || countdown.isExpired) {
    if (!showPlaceholder) return null;

    if (large) {
      return (
        <div className="countdown countdown-large countdown-placeholder">
          {label && <div className="countdown-label">{label}</div>}
          <div className="countdown-values">
            <Calendar size={24} className="countdown-icon" />
            <span className="countdown-tba">Date TBA</span>
          </div>
        </div>
      );
    }

    return (
      <div className="countdown countdown-compact countdown-placeholder">
        <Calendar size={14} className="countdown-icon" />
        <span className="countdown-value">TBA</span>
      </div>
    );
  }

  const { days, hours, minutes, seconds, urgency } = countdown;

  if (large) {
    return (
      <div className={`countdown countdown-large countdown-${urgency}`}>
        {label && <div className="countdown-label">{label}</div>}
        <div className="countdown-values">
          <div className="countdown-unit">
            <span className="countdown-number">{String(days).padStart(2, '0')}</span>
            <span className="countdown-text">Days</span>
          </div>
          <span className="countdown-separator">:</span>
          <div className="countdown-unit">
            <span className="countdown-number">{String(hours).padStart(2, '0')}</span>
            <span className="countdown-text">Hrs</span>
          </div>
          <span className="countdown-separator">:</span>
          <div className="countdown-unit">
            <span className="countdown-number">{String(minutes).padStart(2, '0')}</span>
            <span className="countdown-text">Min</span>
          </div>
          <span className="countdown-separator">:</span>
          <div className="countdown-unit">
            <span className="countdown-number">{String(seconds).padStart(2, '0')}</span>
            <span className="countdown-text">Sec</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`countdown countdown-compact countdown-${urgency}`}>
      <Clock size={14} className="countdown-icon" />
      {label && <span className="countdown-label">{label}</span>}
      <span className="countdown-value">{countdown.display?.full}</span>
    </div>
  );
}

export default CountdownDisplay;
