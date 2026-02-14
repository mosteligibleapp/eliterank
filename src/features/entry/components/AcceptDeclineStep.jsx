import React from 'react';
import { Crown, User, MapPin, Calendar, Clock, Check, X } from 'lucide-react';
import { getCityName } from '../utils/eligibilityEngine';

/**
 * AcceptDeclineStep - Third-party nominees only
 * Shows nomination details with nominator's reason, accept/decline buttons.
 * Decline is only allowed here — nowhere else in the flow.
 */
export default function AcceptDeclineStep({
  nominee,
  competition,
  onAccept,
  onDecline,
  processing,
}) {
  const nominatorDisplay = nominee?.nominator_anonymous
    ? 'Someone special'
    : (nominee?.nominator_name || 'Someone');

  const cityName = getCityName(competition);
  const season = competition?.season || '';

  return (
    <div className="entry-step entry-step-accept">
      {/* Crown icon */}
      <div className="entry-accept-icon">
        <Crown size={36} />
      </div>

      <h2 className="entry-step-title">You've Been Nominated!</h2>
      <p className="entry-accept-competition">
        Most Eligible {cityName} {season}
      </p>

      {/* Nomination details */}
      <div className="entry-accept-details">
        <div className="entry-accept-nominator">
          <User size={16} />
          <span className="entry-accept-label">Nominated by</span>
        </div>
        <p className="entry-accept-nominator-name">{nominatorDisplay}</p>

        {nominee?.nomination_reason && (
          <div className="entry-accept-reason">
            <p className="entry-accept-reason-label">Why they nominated you:</p>
            <blockquote className="entry-accept-quote">
              "{nominee.nomination_reason}"
            </blockquote>
          </div>
        )}
      </div>

      {/* Competition info */}
      <div className="entry-accept-meta">
        {cityName && (
          <span className="entry-accept-meta-item">
            <MapPin size={14} />
            {cityName}
          </span>
        )}
        {season && (
          <span className="entry-accept-meta-item">
            <Calendar size={14} />
            {season}
          </span>
        )}
      </div>

      <p className="entry-accept-fine-print">
        By accepting, you'll build your card and be entered pending host approval.
      </p>

      {/* Action buttons */}
      <div className="entry-accept-actions">
        <button
          className="entry-btn-secondary entry-btn-decline"
          onClick={onDecline}
          disabled={processing}
        >
          <X size={18} />
          Decline
        </button>
        <button
          className="entry-btn-primary entry-btn-accept"
          onClick={onAccept}
          disabled={processing}
        >
          <Check size={18} />
          {processing ? 'Accepting...' : 'Accept'}
        </button>
      </div>

      {/* Deadline */}
      {competition?.nomination_end && (
        <div className="entry-accept-deadline">
          <Clock size={14} />
          <span>
            Respond by{' '}
            {new Date(competition.nomination_end).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            })}
          </span>
        </div>
      )}
    </div>
  );
}
