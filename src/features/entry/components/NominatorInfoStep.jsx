import React from 'react';
import { Mail, EyeOff } from 'lucide-react';

/**
 * Nomination: Nominator's info (name, email, anonymous toggle)
 */
export default function NominatorInfoStep({
  data,
  onChange,
  onSubmit,
  isSubmitting,
  error,
}) {
  const isValid = data.name.trim() && data.email.trim() && data.email.includes('@');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (isValid) onSubmit();
  };

  return (
    <form className="entry-step entry-step-nominator" onSubmit={handleSubmit}>
      <h2 className="entry-step-title">About you</h2>
      <p className="entry-step-subtitle">
        We'll let you know when your nomination is reviewed
      </p>

      <div className="entry-form-field">
        <label className="entry-label">Your Name *</label>
        <input
          type="text"
          className="entry-input"
          value={data.name}
          onChange={(e) => onChange({ name: e.target.value })}
          placeholder="Your full name"
          autoComplete="name"
        />
      </div>

      <div className="entry-form-field">
        <label className="entry-label">Your Email *</label>
        <div className="entry-input-icon">
          <Mail size={18} />
          <input
            type="email"
            className="entry-input"
            value={data.email}
            onChange={(e) => onChange({ email: e.target.value })}
            placeholder="your@email.com"
            autoComplete="email"
          />
        </div>
      </div>

      {/* Anonymous toggle */}
      <button
        type="button"
        className={`entry-anonymous-toggle ${data.anonymous ? 'active' : ''}`}
        onClick={() => onChange({ anonymous: !data.anonymous })}
      >
        <EyeOff size={18} />
        <span>Keep my identity anonymous</span>
        <span className={`entry-toggle-switch ${data.anonymous ? 'on' : ''}`} />
      </button>

      {error && <p className="entry-error">{error}</p>}

      <button
        type="submit"
        className="entry-btn-primary"
        disabled={!isValid || isSubmitting}
      >
        {isSubmitting ? 'Submitting...' : 'Submit Nomination'}
      </button>
    </form>
  );
}
