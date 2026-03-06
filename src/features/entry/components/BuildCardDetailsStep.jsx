import React from 'react';
import { Mail, Phone, Instagram, MapPin } from 'lucide-react';

/**
 * BuildCardDetailsStep - Unified details for ALL nominees
 * Collects: firstName, lastName, age, location, email/phone, instagram
 * Pre-fills from profile (logged-in) or nominee record (third-party)
 *
 * @param {boolean} requireEmail - If true, email is required (for account creation)
 */
export default function BuildCardDetailsStep({
  data,
  onChange,
  onNext,
  error,
  isSubmitting,
  requireEmail = false,
}) {
  const handleChange = (field) => (e) => {
    onChange({ [field]: e.target.value });
  };

  const hasEmail = data.email?.trim() && data.email.includes('@');
  const hasPhone = data.phone?.trim().length > 0;
  const hasContact = hasEmail || hasPhone;

  // Email is required for account creation (third-party flow without existing user)
  const emailRequired = requireEmail || !hasPhone;
  const contactValid = requireEmail ? hasEmail : hasContact;

  const isValid =
    data.firstName?.trim() &&
    data.lastName?.trim() &&
    contactValid &&
    data.age &&
    parseInt(data.age, 10) >= 18 &&
    data.location?.trim();

  const handleSubmit = (e) => {
    e.preventDefault();
    if (isValid) onNext();
  };

  return (
    <form className="entry-step entry-step-details" onSubmit={handleSubmit}>
      <h2 className="entry-step-title">Your details</h2>
      <p className="entry-step-subtitle">Tell us about yourself</p>

      <div className="entry-form-row">
        <div className="entry-form-field">
          <label className="entry-label">First Name *</label>
          <input
            type="text"
            className="entry-input"
            value={data.firstName || ''}
            onChange={handleChange('firstName')}
            placeholder="First name"
            autoComplete="given-name"
          />
        </div>
        <div className="entry-form-field">
          <label className="entry-label">Last Name *</label>
          <input
            type="text"
            className="entry-input"
            value={data.lastName || ''}
            onChange={handleChange('lastName')}
            placeholder="Last name"
            autoComplete="family-name"
          />
        </div>
      </div>

      <div className="entry-form-field">
        <label className="entry-label">Age *</label>
        <input
          type="number"
          className="entry-input"
          value={data.age || ''}
          onChange={handleChange('age')}
          placeholder="Your age"
          min="18"
          max="99"
          inputMode="numeric"
        />
      </div>

      <div className="entry-form-field">
        <label className="entry-label">Location *</label>
        <div className="entry-input-icon">
          <MapPin size={18} />
          <input
            type="text"
            className="entry-input"
            value={data.location || ''}
            onChange={handleChange('location')}
            placeholder="e.g., Austin, TX"
            autoComplete="address-level2"
          />
        </div>
      </div>

      <div className="entry-form-field">
        <label className="entry-label">Email {emailRequired ? '*' : ''}</label>
        <div className="entry-input-icon">
          <Mail size={18} />
          <input
            type="email"
            className="entry-input"
            value={data.email || ''}
            onChange={handleChange('email')}
            placeholder="your@email.com"
            autoComplete="email"
            required={emailRequired}
          />
        </div>
        {requireEmail && !hasEmail && (
          <p className="entry-field-hint" style={{ fontSize: '12px', color: '#888', marginTop: '4px' }}>
            Required to create your account
          </p>
        )}
      </div>

      <div className="entry-form-field">
        <label className="entry-label">Phone {hasContact ? '' : '*'}</label>
        <div className="entry-input-icon">
          <Phone size={18} />
          <input
            type="tel"
            className="entry-input"
            value={data.phone || ''}
            onChange={handleChange('phone')}
            placeholder="(555) 555-5555"
            autoComplete="tel"
          />
        </div>
      </div>

      {/* SMS Consent - only show if phone number is provided */}
      {data.phone?.trim() && (
        <label className="entry-checkbox-label" style={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: '10px',
          marginTop: '-8px',
          marginBottom: '16px',
          cursor: 'pointer',
        }}>
          <input
            type="checkbox"
            checked={data.smsConsent || false}
            onChange={(e) => onChange({ smsConsent: e.target.checked })}
            style={{
              width: '18px',
              height: '18px',
              marginTop: '2px',
              accentColor: '#d4af37',
              flexShrink: 0,
            }}
          />
          <span style={{
            fontSize: '13px',
            color: 'rgba(255,255,255,0.6)',
            lineHeight: 1.4,
          }}>
            I agree to receive competition updates via SMS. Msg frequency varies. Msg & data rates may apply. Reply STOP to opt out. 
            <a href="/privacy" target="_blank" style={{ color: '#d4af37', marginLeft: '4px' }}>Privacy Policy</a>
            {' · '}
            <a href="/terms" target="_blank" style={{ color: '#d4af37' }}>Terms</a>
          </span>
        </label>
      )}

      {!hasContact && (
        <p className="entry-hint">Email or phone is required</p>
      )}

      <div className="entry-form-field">
        <label className="entry-label">Instagram</label>
        <div className="entry-input-icon">
          <Instagram size={18} />
          <input
            type="text"
            className="entry-input"
            value={data.instagram || ''}
            onChange={(e) =>
              onChange({ instagram: e.target.value.replace('@', '') })
            }
            placeholder="username"
          />
        </div>
      </div>

      {error && <p className="entry-error">{error}</p>}

      <button
        type="submit"
        className="entry-btn-primary"
        disabled={!isValid || isSubmitting}
      >
        {isSubmitting ? 'Saving...' : 'Continue'}
      </button>
    </form>
  );
}
